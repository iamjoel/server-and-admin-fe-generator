<template>
  <div class="main">
    <div class="ly ly-r mb-10">
      <el-button type="primary" @click="add">新增</el-button>
    </div>
    <el-table
    <el-table
      :data="list"
      border
      stripe>
      <el-table-column
        type="index"
        label="序列"
        align="center"
        width="80">
      </el-table-column>
      
      <el-table-column
        prop="key"
        label="英文名"
        >
        <template slot-scope="scope">
          <el-input v-model="scope.row.key" @change="scope.row.hasChanged = true"></el-input>
        </template>
      </el-table-column>
      
      <el-table-column
        prop="label"
        label="中文名"
        >
        <template slot-scope="scope">
          <el-input v-model="scope.row.label" @change="scope.row.hasChanged = true"></el-input>
        </template>
      </el-table-column>
      <el-table-column
        prop="key"
        label="操作"
        >
        <template slot-scope="scope">
          <el-button type="info" size="small" @click="save(scope.row)" v-show="scope.row.hasChanged">保存</el-button>
          <el-button type="danger" size="small" @click="remove(scope.row.id, scope.$index)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>
  </div>
</template>

<script src="./list.js">

</script>

<style scoped></style>