# LeanCloud 云函数控制台创建模板

由于无法使用命令行工具部署云函数，您可以直接在 LeanCloud 控制台中手动创建云函数。以下是所有云函数的完整代码模板。

## 1. checkDoctorRole - 检查医生身份

### 函数名称
checkDoctorRole

### 函数代码
```javascript
const AV = require('leanengine');

AV.Cloud.define('checkDoctorRole', async (request) => {
  try {
    const user = request.currentUser;
    if (!user) {
      throw new AV.Cloud.Error('用户未登录', {code: 401});
    }

    // 查询医生认证信息
    const doctorQuery = new AV.Query('DoctorProfile');
    doctorQuery.equalTo('user', user);
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
```

## 2. createFollowUpPlan - 创建随访计划

### 函数名称
createFollowUpPlan

### 函数代码
```javascript
const AV = require('leanengine');

AV.Cloud.define('createFollowUpPlan', async (request) => {
  try {
    const user = request.currentUser;
    const event = request.params;
    
    if (!user) {
      throw new AV.Cloud.Error('用户未登录', {code: 401});
    }

    // 验证医生身份
    const doctorQuery = new AV.Query('DoctorProfile');
    doctorQuery.equalTo('user', user);
    doctorQuery.equalTo('status', 'approved');
    const doctorProfile = await doctorQuery.first();

    if (!doctorProfile) {
      throw new AV.Cloud.Error('您不是认证医生，无法创建随访计划');
    }

    // 创建随访计划
    const followUpPlan = new AV.Object('FollowUpPlan');
    followUpPlan.set('creator', user);
    followUpPlan.set('title', event.title);
    followUpPlan.set('timeType', event.timeType);
    followUpPlan.set('questions', event.questions);
    followUpPlan.set('participantCount', 0);

    await followUpPlan.save();

    return {
      success: true,
      planId: followUpPlan.id
    };
  } catch (error) {
    console.error('创建随访计划失败:', error);
    throw new AV.Cloud.Error(error.message || '创建随访计划失败');
  }
});
```

## 3. getDoctorTeam - 获取医生团队

### 函数名称
getDoctorTeam

### 函数代码
```javascript
const AV = require('leanengine');

AV.Cloud.define('getDoctorTeam', async (request) => {
  try {
    const user = request.currentUser;
    
    if (!user) {
      throw new AV.Cloud.Error('用户未登录', {code: 401});
    }

    // 查询当前医生的认证信息
    const doctorQuery = new AV.Query('DoctorProfile');
    doctorQuery.equalTo('user', user);
    doctorQuery.equalTo('status', 'approved');
    const doctorProfile = await doctorQuery.first();

    if (!doctorProfile) {
      throw new AV.Cloud.Error('您不是认证医生，无法获取团队信息');
    }

    // 查询同一医院和科室的医生
    const teamQuery = new AV.Query('DoctorProfile');
    teamQuery.equalTo('hospital', doctorProfile.get('hospital'));
    teamQuery.equalTo('department', doctorProfile.get('department'));
    teamQuery.equalTo('status', 'approved');
    const teamDoctors = await teamQuery.find();

    // 格式化团队成员数据
    const teamMembers = teamDoctors.map(doctor => {
      const doctorUser = doctor.get('user');
      return {
        userId: doctorUser.id,
        name: doctor.get('name'),
        title: doctor.get('title'),
        hospital: doctor.get('hospital'),
        department: doctor.get('department'),
        avatar: doctorUser.get('avatarUrl') || ''
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
```

## 4. submitFollowUpRecord - 提交随访记录

### 函数名称
submitFollowUpRecord

### 函数代码
```javascript
const AV = require('leanengine');

AV.Cloud.define('submitFollowUpRecord', async (request) => {
  try {
    const user = request.currentUser;
    const event = request.params;
    
    if (!user) {
      throw new AV.Cloud.Error('用户未登录', {code: 401});
    }

    // 查询随访计划
    const planQuery = new AV.Query('FollowUpPlan');
    const followUpPlan = await planQuery.get(event.planId);

    if (!followUpPlan) {
      throw new AV.Cloud.Error('随访计划不存在');
    }

    // 创建随访记录
    const followUpRecord = new AV.Object('FollowUpRecord');
    followUpRecord.set('user', user);
    followUpRecord.set('plan', followUpPlan);
    followUpRecord.set('answers', event.answers);
    followUpRecord.set('submittedAt', new Date());
    followUpRecord.set('status', 'completed');

    // 生成模拟AI报告（开发环境使用）
    const aiReport = generateMockAIReport(event.answers);
    followUpRecord.set('aiReport', aiReport);

    await followUpRecord.save();

    // 更新随访计划的参与人数
    followUpPlan.increment('participantCount', 1);
    await followUpPlan.save();

    return {
      success: true,
      recordId: followUpRecord.id
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
```

## 在 LeanCloud 控制台中创建云函数的步骤

1. 登录 [LeanCloud 控制台](https://console.leancloud.cn/)
2. 选择您的应用：`qFY2EfADtBfkzbT7SvDql1Ba-gzGzoHsz`
3. 进入「云引擎」>「云函数」页面
4. 点击「创建云函数」按钮
5. 填写以下信息：
   - 函数名称：填写上述云函数名称（如 `checkDoctorRole`）
   - 函数代码：复制粘贴上述对应的函数代码
   - 函数类型：选择「同步函数」
   - 运行时：选择「Node.js 8」或「Node.js 10」
6. 点击「保存」按钮
7. 重复上述步骤创建所有云函数

## 注意事项

1. 确保所有云函数都使用相同的运行时版本
2. 云函数创建后，可能需要几分钟时间才能生效
3. 您可以在「云引擎」>「日志」页面查看云函数的运行日志
4. 如果云函数执行失败，可以在日志中查看详细的错误信息

## 测试云函数

创建完成后，您可以在控制台中测试云函数：

1. 进入「云引擎」>「云函数」页面
2. 点击要测试的云函数的「测试」按钮
3. 选择测试身份（可以选择「匿名」或「指定用户」）
4. 点击「运行」按钮查看测试结果

完成以上步骤后，您的云函数就可以正常使用了。前端代码无需修改，仍然使用 `AV.Cloud.run('云函数名称', {参数})` 的方式调用云函数。