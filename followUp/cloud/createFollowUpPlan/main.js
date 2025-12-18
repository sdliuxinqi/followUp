// cloud/createFollowUpPlan/main.js
const AV = require('leanengine');

/**
 * 创建随访计划
 */
AV.Cloud.define('createFollowUpPlan', async (request) => {
  try {
    const user = request.currentUser;
    const event = request.params;
    
    if (!user) {
      throw new AV.Cloud.Error('用户未登录', {code: 401});
    }

    // 用户已经在上面检查过了，不会为null

    // 验证医生身份
    const doctorQuery = new AV.Query('DoctorProfile');
    doctorQuery.equalTo('user', AV.Object.createWithoutData('_User', user.id));
    doctorQuery.equalTo('status', 'approved');
    const doctorProfile = await doctorQuery.first();

    if (!doctorProfile) {
      return {
        success: false,
        message: '非认证医生，无法创建随访计划'
      };
    }

    // 创建随访计划
    const followUpPlan = new AV.Object('FollowUpPlan');
    followUpPlan.set('creator', AV.Object.createWithoutData('_User', user.id));
    followUpPlan.set('title', event.title);
    followUpPlan.set('timeType', event.timeType);
    followUpPlan.set('questions', event.questions);
    followUpPlan.set('participantCount', 0);

    const savedPlan = await followUpPlan.save();

    return {
      success: true,
      planId: followUpPlan.id
    };
  } catch (error) {
    console.error('创建随访计划失败:', error);
    throw new AV.Cloud.Error(error.message || '创建随访计划失败');
  }
});