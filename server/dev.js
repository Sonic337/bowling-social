require('dotenv').config()
const path = require('path')
const app = require('./app')

const PORT = process.env.PORT || 3001

if (process.env.NODE_ENV === 'production') {
  app.use(require('express').static(path.join(__dirname, '../dist')))
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../dist/index.html'))
  })
}

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})
