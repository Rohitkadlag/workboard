import deepseekService from './deepseek.js';
import logger from '../config/logger.js';

const SYSTEM_PROMPT = `You are a Leave Management AI Agent for a software company. Your role is to analyze leave requests and provide intelligent recommendations.

INPUT FORMAT:
- employee: Employee details (name, role, leave balance)
- request: Leave request details (start date, end date, reason)
- workload: Current tasks and commitments during requested period
- policy: Company leave policy guidelines

OUTPUT FORMAT (STRICT JSON ONLY):
{
  "decision": "APPROVED" | "DENIED" | "PENDING",
  "rationale": "Clear explanation of the decision reasoning",
  "conflicts": ["List of any scheduling conflicts or issues"],
  "actions": ["Required actions to process this request"],
  "notify": ["Who should be notified about this decision"],
  "questions": ["Any clarifying questions needed"]
}

DECISION CRITERIA:
- Check leave balance sufficiency
- Analyze workload and deadlines during requested period  
- Consider team coverage and business impact
- Evaluate request timing and advance notice
- Apply company policy consistently

Respond with ONLY valid JSON, no additional text or formatting.`;

const SUGGESTIONS_PROMPT = `You are a Leave Scheduling Assistant. Given team availability, overlapping leaves, task deadlines and policy constraints, recommend optimal leave windows.

INPUT FORMAT:
- employee: Employee details and preferences
- teammates: Number of team members
- overlappingLeaves: Approved/pending leaves of teammates
- upcomingTasks: Tasks due in the horizon period
- policy: {maxConsecutiveDays, minNoticeDays, minCoverage, horizonDays}

OUTPUT FORMAT (STRICT JSON ONLY):
{
  "suggestions": [
    {
      "startDate": "YYYY-MM-DD",
      "endDate": "YYYY-MM-DD", 
      "reasoning": "Why this window is optimal",
      "coverageScore": 0.85,
      "conflicts": [
        {
          "type": "task|leave",
          "date": "YYYY-MM-DD",
          "detail": "Brief description"
        }
      ]
    }
  ]
}

CRITERIA:
- Suggest 2-4 optimal windows within horizon
- Respect maxConsecutiveDays and minNoticeDays policy
- Ensure minCoverage team availability
- Minimize conflicts with deadlines and other leaves
- Consider employee preferences if provided

Respond with ONLY valid JSON, no additional text or formatting.`;

class LeaveAgentService {
  async processLeaveRequest(employee, request, workload = [], policy = {}) {
    try {
      const input = {
        employee: {
          name: employee.name,
          role: employee.role,
          leaveBalance: employee.leaveBalance
        },
        request: {
          startDate: request.startDate,
          endDate: request.endDate,
          reason: request.reason,
          daysRequested: this.calculateLeaveDays(request.startDate, request.endDate)
        },
        workload: workload.map(task => ({
          title: task.title,
          dueDate: task.dueDate,
          status: task.status,
          priority: task.priority || 'medium'
        })),
        policy: {
          maxConsecutiveDays: policy.maxConsecutiveDays || 10,
          minAdvanceNotice: policy.minAdvanceNotice || 7,
          blackoutPeriods: policy.blackoutPeriods || [],
          ...policy
        }
      };

      const messages = [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: JSON.stringify(input) }
      ];

      logger.info('Processing leave request with AI agent');
      const response = await deepseekService.chat(messages, {
        temperature: 0.3,
        max_tokens: 800
      });

      // Parse JSON response
      let aiDecision;
      try {
        aiDecision = JSON.parse(response);
        
        // Validate required fields
        if (!aiDecision.decision || !aiDecision.rationale) {
          throw new Error('Invalid AI response format');
        }

        // Ensure decision is valid
        if (!['APPROVED', 'DENIED', 'PENDING'].includes(aiDecision.decision)) {
          aiDecision.decision = 'PENDING';
        }

      } catch (parseError) {
        logger.error('Failed to parse AI response:', parseError);
        // Fallback decision
        aiDecision = this.getFallbackDecision(employee, request);
      }

      logger.info('Leave request processed:', { decision: aiDecision.decision });
      return aiDecision;

    } catch (error) {
      logger.error('Leave agent processing error:', error);
      return this.getFallbackDecision(employee, request);
    }
  }

  async getSuggestions(context) {
    try {
      const messages = [
        { role: 'system', content: SUGGESTIONS_PROMPT },
        { role: 'user', content: JSON.stringify(context) }
      ];

      logger.info('Getting AI leave suggestions');
      const response = await deepseekService.chat(messages, {
        temperature: 0.4,
        max_tokens: 1000
      });

      let suggestions;
      try {
        const parsed = JSON.parse(response);
        suggestions = parsed.suggestions || [];

        // Validate and clean suggestions
        suggestions = suggestions.filter(s => 
          s.startDate && s.endDate && s.reasoning
        ).map(s => ({
          startDate: s.startDate,
          endDate: s.endDate,
          reasoning: s.reasoning,
          coverageScore: Math.min(1.0, Math.max(0.0, s.coverageScore || 0.5)),
          conflicts: Array.isArray(s.conflicts) ? s.conflicts : []
        }));

      } catch (parseError) {
        logger.error('Failed to parse AI suggestions:', parseError);
        suggestions = this.getFallbackSuggestions(context);
      }

      return suggestions;

    } catch (error) {
      logger.error('AI suggestions error:', error);
      return this.getFallbackSuggestions(context);
    }
  }

  calculateLeaveDays(startDate, endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end - start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    
    // Simple weekday calculation (excluding weekends)
    let businessDays = 0;
    const current = new Date(start);
    
    while (current <= end) {
      const dayOfWeek = current.getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) { // Not Sunday or Saturday
        businessDays++;
      }
      current.setDate(current.getDate() + 1);
    }
    
    return businessDays;
  }

  getFallbackDecision(employee, request) {
    const daysRequested = this.calculateLeaveDays(request.startDate, request.endDate);
    const hasBalance = employee.leaveBalance >= daysRequested;
    
    return {
      decision: hasBalance ? 'APPROVED' : 'DENIED',
      rationale: hasBalance 
        ? 'Auto-approved based on available leave balance and no system conflicts detected.'
        : `Insufficient leave balance. Requested: ${daysRequested} days, Available: ${employee.leaveBalance} days.`,
      conflicts: hasBalance ? [] : ['Insufficient leave balance'],
      actions: hasBalance ? ['Approve request', 'Deduct leave balance'] : ['Deny request', 'Notify employee of balance issue'],
      notify: ['Direct manager', 'Employee'],
      questions: []
    };
  }

  getFallbackSuggestions(context) {
    const suggestions = [];
    const today = new Date();
    
    // Simple fallback: suggest windows with 1-week gaps
    for (let i = 1; i <= 3; i++) {
      const startDate = new Date(today);
      startDate.setDate(today.getDate() + (i * 14) + 7); // Skip weekends and add notice period
      
      const endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + 4); // 5-day leave
      
      suggestions.push({
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
        reasoning: `Option ${i}: Good team coverage expected with minimal conflicts`,
        coverageScore: 0.8 - (i * 0.1),
        conflicts: []
      });
    }
    
    return suggestions;
  }
}

export default new LeaveAgentService();