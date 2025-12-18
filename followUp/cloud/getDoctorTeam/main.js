// cloud/getDoctorTeam/main.js
const AV = require('leanengine');

/**
 * 获取医生团队成员
 */
AV.Cloud.define('getDoctorTeam', async (request) => {
  try {
    const user = request.currentUser;
    const event = request.params;
    
    if (!user) {
      throw new AV.Cloud.Error('用户未登录', {code: 401});
    }

    // 用户已经在上面检查过了，不会为null

    // 查询当前医生的认证信息
    const doctorQuery = new AV.Query('DoctorProfile');
    doctorQuery.equalTo('user', AV.Object.createWithoutData('_User', user.id));
    doctorQuery.equalTo('status', 'approved');
    const currentDoctor = await doctorQuery.first();

    if (!currentDoctor) {
      return {
        success: false,
        message: '非认证医生，无法查看团队'
      };
    }

    // 查询同一医院和科室的其他医生
    const teamQuery = new AV.Query('DoctorProfile');
    teamQuery.equalTo('hospital', currentDoctor.get('hospital'));
    teamQuery.equalTo('department', currentDoctor.get('department'));
    teamQuery.equalTo('status', 'approved');
    teamQuery.notEqualTo('user', AV.Object.createWithoutData('_User', user.id)); // 排除当前医生
    
    // 包含用户信息
    teamQuery.include('user');
    
    const teamDoctors = await teamQuery.find();

    // 格式化团队成员数据
const teamMembers = teamDoctors.map(doctor => {
      const user = doctor.get('user');
      return {
        id: doctor.id,
        name: doctor.get('name'),
        hospital: doctor.get('hospital'),
        department: doctor.get('department'),
        avatarUrl: user ? user.get('avatarUrl') || '' : '',
        nickName: user ? user.get('nickName') || '' : ''
      };
    });

    return {
      success: true,
      teamMembers: teamMembers
    };
  } catch (error) {
    console.error('获取医生团队失败:', error);
    throw new AV.Cloud.Error(error.message || '获取医生团队失败');
  }
});