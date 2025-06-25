const { sequelize } = require('../config/database')
const User = require('./User')
const Revenue = require('./Revenue')

// Define associations here if needed
// User.hasMany(Revenue, { foreignKey: 'created_by' })
// Revenue.belongsTo(User, { foreignKey: 'created_by' })

const models = {
  User,
  Revenue,
  sequelize
}

module.exports = models