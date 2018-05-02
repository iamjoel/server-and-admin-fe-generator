import { fetchList, addModel,editModel,deleteModel } from '@/service/api'

export default {
  data() {
    return {
      KEY: 'entity',
      list: [],
      parentList: [],
    }  
  },
  methods: {
    add() {
      this.list.push({
        isNew:true,
        key: '',
        label: '',
        parentId: null
      })
    },
    save(row) {
      var action = row.isNew ? addModel : editModel
      var data = {...row}
      delete data.isNew
      action(this.KEY, data).then(({data})=> {
        if(row.isNew) {
          delete row.isNew
        }
        this.$message({
          showClose: true,
          message: '保存成功',
          type: 'success'
        })
      })
    },
    remove(id, index) {
      deleteModel(this.KEY, id).then(({data})=> {
        this.list.splice(index, 1)
        this.$message({
          showClose: true,
          message: '删除成功',
          type: 'success'
        })
      })
    }
  },
  mounted() {
     fetchList('entityType').then(({data}) => {
      this.parentList = data.data
        fetchList(this.KEY).then(({data}) => {
          this.list = data.data
        })
    })
    
  }
}