#!/bin/bash

# LeanCloud 云引擎接口测试脚本
# 使用方法：./test-api.sh

# ==================== 配置区域 ====================
# 请修改以下配置为你的实际值

# 云引擎域名（部署后从控制台获取）
BASE_URL="https://your-app-name.leanapp.cn"

# SessionToken（通过小程序登录或 REST API 获取）
SESSION_TOKEN="YOUR_SESSION_TOKEN"

# 测试用的计划 ID（创建计划后替换）
PLAN_ID="YOUR_PLAN_ID"

# ==================== 测试函数 ====================

# 打印分隔线
print_separator() {
    echo "=========================================="
}

# 测试 GET 请求（无需认证）
test_get_public() {
    local endpoint=$1
    local description=$2
    
    print_separator
    echo "测试：$description"
    echo "URL: ${BASE_URL}${endpoint}"
    print_separator
    
    curl -X GET "${BASE_URL}${endpoint}" \
        -H "Content-Type: application/json" \
        -w "\n\nHTTP Status: %{http_code}\n" \
        -s | jq '.' 2>/dev/null || curl -X GET "${BASE_URL}${endpoint}" \
        -H "Content-Type: application/json" \
        -w "\n\nHTTP Status: %{http_code}\n" -s
    
    echo -e "\n"
}

# 测试 GET 请求（需要认证）
test_get_auth() {
    local endpoint=$1
    local description=$2
    
    print_separator
    echo "测试：$description"
    echo "URL: ${BASE_URL}${endpoint}"
    print_separator
    
    curl -X GET "${BASE_URL}${endpoint}" \
        -H "Content-Type: application/json" \
        -H "X-LC-Session: ${SESSION_TOKEN}" \
        -w "\n\nHTTP Status: %{http_code}\n" \
        -s | jq '.' 2>/dev/null || curl -X GET "${BASE_URL}${endpoint}" \
        -H "Content-Type: application/json" \
        -H "X-LC-Session: ${SESSION_TOKEN}" \
        -w "\n\nHTTP Status: %{http_code}\n" -s
    
    echo -e "\n"
}

# 测试 POST 请求（需要认证）
test_post_auth() {
    local endpoint=$1
    local description=$2
    local data=$3
    
    print_separator
    echo "测试：$description"
    echo "URL: ${BASE_URL}${endpoint}"
    echo "Data: $data"
    print_separator
    
    curl -X POST "${BASE_URL}${endpoint}" \
        -H "Content-Type: application/json" \
        -H "X-LC-Session: ${SESSION_TOKEN}" \
        -d "$data" \
        -w "\n\nHTTP Status: %{http_code}\n" \
        -s | jq '.' 2>/dev/null || curl -X POST "${BASE_URL}${endpoint}" \
        -H "Content-Type: application/json" \
        -H "X-LC-Session: ${SESSION_TOKEN}" \
        -d "$data" \
        -w "\n\nHTTP Status: %{http_code}\n" -s
    
    echo -e "\n"
}

# ==================== 开始测试 ====================

echo "=========================================="
echo "LeanCloud 云引擎接口测试"
echo "=========================================="
echo "Base URL: ${BASE_URL}"
echo "Session Token: ${SESSION_TOKEN:0:20}..."
echo "=========================================="
echo ""

# 1. 测试无需认证的接口
test_get_public "/v1/meta/departments" "获取科室列表"

# 2. 测试需要认证的接口
test_get_auth "/v1/patient/profile" "获取患者资料"
test_get_auth "/v1/auth/doctor-profile" "获取医生档案"
test_get_auth "/v1/patient/followups" "获取患者随访记录列表"
test_get_auth "/v1/doctor/plans" "获取医生随访计划列表"
test_get_auth "/v1/doctor/team" "获取医生团队信息"

# 3. 测试需要路径参数的接口
if [ "$PLAN_ID" != "YOUR_PLAN_ID" ]; then
    test_get_auth "/v1/doctor/plans/${PLAN_ID}" "获取随访计划详情"
    test_get_auth "/v1/doctor/plans/${PLAN_ID}/records" "获取计划下的随访记录"
    test_get_auth "/v1/followups/plans/${PLAN_ID}" "获取计划详情（患者视角）"
fi

# 4. 测试 POST 接口（示例）
# 注意：以下测试可能会创建数据，请谨慎使用

# test_post_auth "/v1/auth/register-weapp" "注册用户信息" '{
#   "nickname": "测试用户",
#   "avatar": "https://example.com/avatar.jpg",
#   "gender": "male"
# }'

# test_post_auth "/v1/followups/records" "提交随访记录" "{
#   \"planId\": \"${PLAN_ID}\",
#   \"timeType\": \"oneMonth\",
#   \"answers\": {
#     \"basic_name\": \"测试患者\",
#     \"basic_gender\": \"male\"
#   }
# }"

echo "=========================================="
echo "测试完成！"
echo "=========================================="
echo ""
echo "提示："
echo "1. 如果看到 401 错误，请检查 SESSION_TOKEN 是否正确"
echo "2. 如果看到 403 错误，请确认用户权限（医生/患者）"
echo "3. 如果看到 404 错误，请检查 URL 路径是否正确"
echo "4. 查看详细日志：lean logs"
echo ""

