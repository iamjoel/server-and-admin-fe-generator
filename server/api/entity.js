const guidFn = require('../utils/guid')
const apiFormat = require('../utils/apiFormat')
const tableName = 'entity'
const commonCRUD = require('./utils/commonCRUD.js')(tableName)

module.exports = {
  list(req, res, pool) {
    try {
      var results = global.db.get(tableName)
                          .orderBy('order', 'asc')
                          .value()
      results = results.map(entity => {
        let entityType = global.db
                        .get('entityType')
                        .find({
                          id: entity.basic.entityTypeId
                        })
                        .value()
        let entityTypeName = entityType ? (entityType.label || '未命名') : '-'

        if(entity.basic.hasListPage) {
          let page = global.db
                        .get('listPage')
                        .filter(page => {
                          return page.basic.entity.id === entity.id
                        })
                        .value()[0]
          if(page) {
            entity.basic.listPageId = page.id
          }
        }

        if(entity.basic.hasUpdatePage) {
          let page = global.db
                        .get('updatePage')
                        .filter(page => {
                          return page.basic.entity.id === entity.id
                        })
                        .value()[0]
          if(page) {
            entity.basic.updatePageId = page.id
          }
        }
        return {
          ...entity,
          entityTypeName
        }
      })
      res.send(apiFormat.success(results))
    } catch(error) {
      res.send(apiFormat.error(error))
    }
  },
  detail(req, res, pool) {
    commonCRUD.detail(req, res, pool, req.params.id)
  },
  add(req, res, pool) {
    var id = guidFn()
    let basic = req.body.basic
    createPage(basic, id)
    if(basic.hasListPage && basic.isShowInMenu) {
      addMenu(basic, id)
    }

    commonCRUD.add(req, res, pool, id)
  },
  edit(req, res, pool) {
    var id = req.params.id
    let basic = req.body.basic
    createPage(basic, id)
    if(basic.hasListPage && basic.isShowInMenu) {
      addMenu(basic, id)
    }

    commonCRUD.edit(req, res, pool)
  },
  remove(req, res, pool) {
    removePage(req.params.id)
    commonCRUD.remove(req, res, pool)
  },
  commonCols(req, res, pool) {
    try {
        var results = global.db.get('entityConfig')
                            .value()
                            .commonCols
        res.send(apiFormat.success(results))
      } catch(error) {
        res.send(apiFormat.error(error))
      }
  }
}

/*
* 将新增的实体，有条件的同步到 列表，更新页面 和对应的路由。
* 同步条件：实体设置了有列表页/更新页，但列表或更新表没有那条数据，则创建。
* 如果已有列表或更新页，不做覆盖和删除的处理。
*/
function createPage(data, entityId) {
  if(data.hasListPage) {
    addPageAndRoute(data, entityId, 'list')
  }

  if(data.hasUpdatePage) {
    addPageAndRoute(data, entityId, 'update')
  }
}

function addPageAndRoute(entityBasic, entityId, pageType) {
  const entityName = entityBasic.name
  var entity = { // 页面的entity
    id: entityId,
    name: entityName,
    entityTypeId: entityBasic.entityTypeId
  }

  var hasPage = global.db.get(`${pageType}Page`)
                            .filter(page => {
                              return page.basic.entity.id === entityId
                            })
                            .value().length > 0
  if(!hasPage) {
    var entityType = global.db
                        .get('entityType')
                        .find({
                          id: entity.entityTypeId
                        })
                        .value()

    // 新增页面
    global.db
      .get(`${pageType}Page`)
      .push(Object.assign({
        id: guidFn(),
        updateAt: Date.now()
      }, {
        "basic": {
          entity,
          "codePath": `${entityType ? `${entityType.key}/` : ''}${entityName}`
        }
      }))
      .write()
    
    // 新增路由
    global.db
      .get('router')
      .push({
        id: guidFn(),
        entityId,
        name: `${entityBasic.des}${pageType === 'list'? '列表页' : '更新页'}`,
        pageType,
        routePath: `${entityType ? `/${entityType.key}` : ''}/${entityName}/${pageType === 'list' ? 'list' : 'update/:id'}`,
        filePath: `${entityType ? `/${entityType.key}` : ''}/${entityName}/${pageType === 'list' ? 'List' : 'Update'}.vue`,
        updateAt: Date.now()
      })
      .write()
  }
}

// 新增菜单
function addMenu(entityBasic, entityId) {
  var entityType = global.db
                        .get('entityType')
                        .find({
                          id: entityBasic.entityTypeId
                        })
                        .value()
  var menu = global.db
                    .get('menu')
                    .value()

  var tarRouter = global.db
                        .get('router')
                        .find({
                          entityId: entityId
                        })
                        .value()

  var needAddPage = {
    routerId: tarRouter.id,
    name: entityBasic.des || entityBasic.name,
    "showType": "show",
    "roleIds": []
  }

  if(entityType) { // 归属于某个分类
    var tarMenuItem
    var tarPages
    menu.forEach(item => {
      if(item.entityTypeId === entityBasic.entityTypeId) {
        tarMenuItem = item
      }
    })
    
    if(tarMenuItem) {// 已经有分类
      tarMenuItem.children = tarMenuItem.children || []
      tarPages = tarMenuItem.children
      var hasPage = tarPages.filter(item => item.routerId === needAddPage.routerId).length > 0
      if(!hasPage) {
        tarPages.push(needAddPage)
      }
    } else {
      menu.push({
        id: guidFn(),
        "isPage": 0,
        "entityTypeId": entityType.id,
        "routerId": null,
        "name": entityType.label || entityType.key,
        "updateAt": Date.now(),
        children: [needAddPage]
      })
    } 
  } else { // 无分类
    var hasPage = menu.filter(item => item.routerId === needAddPage.routerId).length > 0
    if(!hasPage) {
      menu.push({
        id: guidFn(),
        "isPage": 1,
        "entityTypeId": null,
        "routerId": needAddPage.routerId,
        "name": needAddPage.name,
        "updateAt": Date.now(),
      })
    }
  }

  global.db.set('menu', menu).write()
}

/*
* 删除实体，删除对应的页面
*/
function removePage(entityId) {
  var entityBasic = global.db
                    .get('entity')
                    .find({
                      id: entityId
                    })
                    .value()
                    .basic
  removePageAndRouter(entityId, entityBasic, 'list')
  removePageAndRouter(entityId, entityBasic, 'update')
}

function removePageAndRouter(entityId, entityBasic, pageType) {
  var hasPage = global.db.get(`${pageType}Page`).filter(page => {
    return page.basic.entity.id === entityId
  }).value()
  if(hasPage.length > 0) {
    // 删页面
    global.db
      .get(`${pageType}Page`)
      .remove({
        id: hasPage[0].id,
      })
      .write()

    // 删菜单
    if(pageType === 'list') {
      var entityType = global.db
                        .get('entityType')
                        .find({
                          id: entityBasic.entityTypeId
                        })
                        .value()
      var menu = global.db
                    .get('menu')
                    .value()

      var tarRouter = global.db
                        .get('router')
                        .find({
                          entityId: entityId
                        })
                        .value()

      if(entityType) {
        var tarMenuItem
        var tarPages
        menu.forEach(item => {
          if(item.entityTypeId === entityBasic.entityTypeId) {
            tarMenuItem = item
          }
        })

        if(tarMenuItem && tarMenuItem.children && tarMenuItem.children.length > 0) {
          tarMenuItem.children = tarMenuItem.children.filter(item => item.routerId !== tarRouter.id)
        }

      } else {
        menu = menu.filter(item => {
          console.log(item.routerId === tarRouter.id)
          return item.routerId !== tarRouter.id
        })
      }

      global.db.set('menu', menu).write()
    }

    // 删路由
    global.db
      .get('router')
      .remove({
        entityId,
      })
      .write()
  }
}