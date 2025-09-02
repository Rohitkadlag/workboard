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
}

export default new LeaveAgentService();