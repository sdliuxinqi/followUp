@echo off
REM LeanCloud 云引擎接口测试脚本（Windows 版本）
REM 使用方法：test-api.bat

REM ==================== 配置区域 ====================
REM 请修改以下配置为你的实际值

set BASE_URL=https://your-app-name.leanapp.cn
set SESSION_TOKEN=YOUR_SESSION_TOKEN
set PLAN_ID=YOUR_PLAN_ID

REM ==================== 开始测试 ====================

echo ==========================================
echo LeanCloud 云引擎接口测试
echo ==========================================
echo Base URL: %BASE_URL%
echo Session Token: %SESSION_TOKEN:~0,20%...
echo ==========================================
echo.

REM 1. 测试获取科室列表（无需认证）
echo ==========================================
echo 测试：获取科室列表
echo ==========================================
curl -X GET "%BASE_URL%/v1/meta/departments" ^
    -H "Content-Type: application/json"
echo.
echo.

REM 2. 测试获取患者资料（需要认证）
echo ==========================================
echo 测试：获取患者资料
echo ==========================================
curl -X GET "%BASE_URL%/v1/patient/profile" ^
    -H "Content-Type: application/json" ^
    -H "X-LC-Session: %SESSION_TOKEN%"
echo.
echo.

REM 3. 测试获取医生档案
echo ==========================================
echo 测试：获取医生档案
echo ==========================================
curl -X GET "%BASE_URL%/v1/auth/doctor-profile" ^
    -H "Content-Type: application/json" ^
    -H "X-LC-Session: %SESSION_TOKEN%"
echo.
echo.

REM 4. 测试获取患者随访记录列表
echo ==========================================
echo 测试：获取患者随访记录列表
echo ==========================================
curl -X GET "%BASE_URL%/v1/patient/followups" ^
    -H "Content-Type: application/json" ^
    -H "X-LC-Session: %SESSION_TOKEN%"
echo.
echo.

REM 5. 测试获取医生随访计划列表
echo ==========================================
echo 测试：获取医生随访计划列表
echo ==========================================
curl -X GET "%BASE_URL%/v1/doctor/plans" ^
    -H "Content-Type: application/json" ^
    -H "X-LC-Session: %SESSION_TOKEN%"
echo.
echo.

REM 6. 测试获取医生团队信息
echo ==========================================
echo 测试：获取医生团队信息
echo ==========================================
curl -X GET "%BASE_URL%/v1/doctor/team" ^
    -H "Content-Type: application/json" ^
    -H "X-LC-Session: %SESSION_TOKEN%"
echo.
echo.

REM 如果配置了 PLAN_ID，测试计划相关接口
if not "%PLAN_ID%"=="YOUR_PLAN_ID" (
    echo ==========================================
    echo 测试：获取随访计划详情
    echo ==========================================
    curl -X GET "%BASE_URL%/v1/doctor/plans/%PLAN_ID%" ^
        -H "Content-Type: application/json" ^
        -H "X-LC-Session: %SESSION_TOKEN%"
    echo.
    echo.
)

echo ==========================================
echo 测试完成！
echo ==========================================
echo.
echo 提示：
echo 1. 如果看到 401 错误，请检查 SESSION_TOKEN 是否正确
echo 2. 如果看到 403 错误，请确认用户权限（医生/患者）
echo 3. 如果看到 404 错误，请检查 URL 路径是否正确
echo 4. 查看详细日志：lean logs
echo.
pause

