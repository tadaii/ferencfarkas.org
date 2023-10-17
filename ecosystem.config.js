require('dotenv').config()

module.exports = {
  apps : [{
    name   : 'ferencfarkas.org',
    script : process.env.PM2_SCRIPT_ROOT || 'npm',
    args: 'start',
    watch: ['catalogue']
  }]
}
