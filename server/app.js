const config = require('./config')

const express = require('express')
const app = express()

var bodyParser = require('body-parser')
app.use(bodyParser.json())

// Lowdb https://github.com/typicode/lowdb
const low = require('lowdb')
const FileSync = require('lowdb/adapters/FileSync')
const adapter = new FileSync('db.json')
const db = low(adapter)
global.db = db
/*
* 数据库的 Scheme。 db.json 对应的字段是空的时候的默认值。
* 设置 default 导致 db.json 被间歇性的reload。导致开发时，服务器不断重启。。。
*/
// db.defaults({
//     role : [
//     {
//       id: 'fbbd34d3-7b09-128c-8681-a86ccc934313',
//       label: '管理员',
//       key: 'admin'
//     },{
//       id: 'a6f6aa16-a16b-52d5-fd95-6303c278e4dc',
//       label: '店员',
//       key: 'shop'
//     }],
//     dict: [],
//     entity: [],
//     entityType: [],
//     router: [],
//     listPage: [],
//     updatePage: [],
//     menu: [],
//   })
//   .write()

// 获取 Mysql 连接
var mysql = require('mysql');
var pool = mysql.createPool(config.mysql)

app.get('/', (req, res) => res.send('It works!'))

// 跨域头设置
app.all('*', function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "X-Requested-With,Content-Type, Accept");
    res.header("Access-Control-Allow-Methods","PUT,POST,GET,DELETE,OPTIONS");
    res.header("Content-Type", "application/json;charset=utf-8");
    next();
})

var listPageApi = require('./api/list-page')
var updatePageApi = require('./api/update-page')
// 所有的api
var apis = {
  dict: require('./api/utils/commonCRUD')('dict'),
  role: require('./api/utils/commonCRUD')('role'),
  entityType: require('./api/utils/commonCRUD')('entityType'),
  entity: require('./api/utils/commonCRUD')('entity'),
  router: require('./api/utils/commonCRUD')('router'),
  listPage: require('./api/utils/commonCRUD')('listPage'),
  updatePage: require('./api/utils/commonCRUD')('updatePage'),
  menu: require('./api/utils/commonCRUD')('menu'),
}

generateAPI(Object.keys(apis))

var dashboard = require('./api/dashboard')
app.get('/config/detail', dashboard.detail)
app.post('/config/sync', (req, res)=> {
  dashboard.syncAllConfig(req, res, pool)
})
app.post('/config/sync/:type', (req, res)=> {
  dashboard.syncConfig(req, res, pool)
})

app.post('/list-page/expendCofigToFile/:id', (req, res)=> {
  listPageApi.expendCofigToFile(req, res, pool)
})

app.post('/list-page/updateFreeze/:id', (req, res)=> {
  listPageApi.updateFreeze(req, res, pool)
})

app.post('/update-page/expendCofigToFile/:id', (req, res)=> {
  updatePageApi.expendCofigToFile(req, res, pool)
})

app.post('/update-page/updateFreeze/:id', (req, res)=> {
  updatePageApi.updateFreeze(req, res, pool)
})



function generateAPI(names) {
  names.forEach(name => {
    // 列表
    app.get(`/${name}/list`, (req,res) => {
      apis[name].list(req, res, pool)
    })
    // 详情
    app.get(`/${name}/:id`, (req,res) => {
      apis[name].detail(req, res, pool)
    })
    // 新增
    app.put(`/${name}`, (req,res) => {
      apis[name].add(req, res, pool)
    })
    // 修改
    app.post(`/${name}/:id`, (req,res) => {
      apis[name].edit(req, res, pool)
    })
    // 删除
    app.delete(`/${name}/:id`, (req,res) => {
      apis[name].remove(req, res, pool)
    })
  })
}

app.listen(config.port, () => console.log(`app listening on port ${config.port}!`))