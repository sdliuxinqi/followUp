// cloud/submitFollowUpRecord/main.js
const AV = require('leanengine');

/**
 * 提交随访记录
 */
AV.Cloud.define('submitFollowUpRecord', async (request) => {
  try {
    const user = request.currentUser;
    const event = request.params;
    
    if (!user) {
      throw new AV.Cloud.Error('用户未登录', {code: 401});
    }

    // 用户已经在上面检查过了，不会为null

    // 查询随访计划
    const planQuery = new AV.Query('FollowUpPlan');
    const plan = await planQuery.get(event.planId);

    if (!plan) {
      return {
        success: false,
        message: '随访计划不存在'
      };
    }

    // 创建随访记录
    const followUpRecord = new AV.Object('FollowUpRecord');
    followUpRecord.set('plan', AV.Object.createWithoutData('FollowUpPlan', event.planId));
    followUpRecord.set('patient', AV.Object.createWithoutData('_User', user.id));
    followUpRecord.set('answers', event.answers);
    
    // 处理视频文件
    if (event.videoFiles && event.videoFiles.length > 0) {
      const videoObjects = [];
      for (const videoUrl of event.videoFiles) {
        // 注意：这里需要处理视频文件的保存逻辑
        // 实际应用中应该从微信临时文件上传到LeanCloud
        videoObjects.push(videoUrl);
      }
      followUpRecord.set('videoFiles', videoObjects);
    }

    // 保存随访记录
    const savedRecord = await followUpRecord.save();

    // 更新随访计划的参与人数
    plan.increment('participantCount', 1);
    await plan.save();

    // 触发AI分析（模拟）
    // 实际应用中应该调用外部AI服务或生成PDF
    const aiReportContent = generateMockAIReport(event.answers);
    savedRecord.set('aiReportContent', aiReportContent);
    await savedRecord.save();

    return {
      success: true,
      recordId: savedRecord.id
    };
  } catch (error) {
    console.error('提交随访记录失败:', error);
    throw new AV.Cloud.Error(error.message || '提交随访记录失败');
  }
});

/**
 * 生成模拟AI报告（开发环境使用）
 */
function generateMockAIReport(answers) {
  // 简单的模拟逻辑，实际项目中可以替换为真实的AI分析
  const report = {
    summary: '患者当前状态稳定，建议继续观察。',
    recommendations: [
      '保持良好的生活习惯',
      '定期复查',
      '如有不适及时就诊'
    ],
    riskLevel: '低'
  };

  return report;
}