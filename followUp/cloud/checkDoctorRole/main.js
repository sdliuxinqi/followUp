// cloud/checkDoctorRole/main.js
const AV = require('leanengine');

/**
 * 检查当前用户是否已认证为医生
 */
AV.Cloud.define('checkDoctorRole', async (request) => {
  try {
    const user = request.currentUser;
    if (!user) {
      throw new AV.Cloud.Error('用户未登录', {code: 401});
    }

    // 这里的user已经在上面检查过了，不会为null

    // 查询医生认证信息
    const doctorQuery = new AV.Query('DoctorProfile');
    doctorQuery.equalTo('user', AV.Object.createWithoutData('_User', user.id));
    doctorQuery.equalTo('status', 'approved');
    const doctorProfile = await doctorQuery.first();

    return {
      success: true,
      isDoctor: !!doctorProfile,
      doctorProfile: doctorProfile ? {
        name: doctorProfile.get('name'),
        hospital: doctorProfile.get('hospital'),
        department: doctorProfile.get('department'),
        title: doctorProfile.get('title'),
        licenseNumber: doctorProfile.get('licenseNumber')
      } : null
    };
  } catch (error) {
    console.error('检查医生身份失败:', error);
    throw new AV.Cloud.Error(error.message || '检查医生身份失败');
  }
});