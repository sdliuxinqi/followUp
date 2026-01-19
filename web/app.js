'use strict'

const express = require('express')
const timeout = require('connect-timeout')
const path = require('path')
const cookieParser = require('cookie-parser')
const bodyParser = require('body-parser')
const AV = require('leanengine')

// Loads cloud function definitions.
// You can split them into several files, but don't forget to load them into the main file.
require('./cloud')

const app = express()

// Configures template engine.
app.set('views', path.join(__dirname, 'views'))
app.set('view engine', 'ejs')

// Configures default timeout.
app.use(timeout('15s'))

// Loads LeanEngine middleware.
app.use(AV.express())

app.enable('trust proxy')
// Uncomment the following line to redirect all HTTP requests to HTTPS.
// app.use(AV.Cloud.HttpsRedirect())

app.use(express.static('public'))

// 增加请求体大小限制，支持大图片上传（10MB）
// base64 编码会使数据增大约 33%，所以需要更大的限制
app.use(bodyParser.json({ limit: '10mb' }))
app.use(bodyParser.urlencoded({ extended: false, limit: '10mb' }))
app.use(cookieParser())

app.get('/', (req, res) => {
  res.header('Cache-Control', 'no-cache')
  res.render('index', { currentTime: new Date() })
})

// 简单的健康检查接口 - 用于测试部署是否成功
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    message: '服务运行正常',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'production'
  })
})

// 简单的测试接口 - 测试 LeanCloud 连接
app.get('/test', async (req, res) => {
  try {
    // 测试 LeanCloud 连接
    const TestObject = AV.Object.extend('TestObject')
    const testObj = new TestObject()
    testObj.set('testField', 'test')
    testObj.set('timestamp', new Date())
    
    // 尝试保存（使用 useMasterKey 避免权限问题）
    await testObj.save(null, { useMasterKey: true })
    
    res.json({
      success: true,
      message: '接口测试成功，LeanCloud 连接正常',
      timestamp: new Date().toISOString(),
      testObjectId: testObj.id,
      leancloud: {
        appId: process.env.LEANCLOUD_APP_ID ? '已配置' : '未配置',
        appKey: process.env.LEANCLOUD_APP_KEY ? '已配置' : '未配置'
      }
    })
  } catch (err) {
    res.status(500).json({
      success: false,
      message: '接口测试失败',
      error: err.message,
      timestamp: new Date().toISOString()
    })
  }
})

// RESTful API 路由
app.use('/v1/auth', require('./routes/auth'))
app.use('/v1', require('./routes/followup'))

// 示例 Todo 路由，可按需保留或删除
app.use('/todos', require('./routes/todos'))

app.use((req, res, next) => {
  // If there is no routing answering, throw a 404 exception to exception handlers.
  if (!res.headersSent) {
    const err = new Error('Not Found')
    err.status = 404
    next(err)
  }
})

// error handler
app.use((err, req, res, next) => {
  if (req.timedout && req.headers.upgrade === 'websocket') {
    // Ignores websocket timeout.
    return
  }

  const statusCode = err.status || 500
  if (statusCode === 500) {
    console.error(err.stack || err)
  }
  if (req.timedout) {
    console.error('Request timeout: url=%s, timeout=%d, please check whether its execution time is too long, or the response callback is invalid.', req.originalUrl, err.timeout)
  }
  res.status(statusCode)
  // Do not output exception details by default.
  let error = {}
  if (app.get('env') === 'development') {
    // Displays exception stack on page if running in the development enviroment.
    error = err
  }
  res.render('error', {
    message: err.message,
    error: error
  })
})

module.exports = app
