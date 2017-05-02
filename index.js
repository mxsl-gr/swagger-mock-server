const express = require('express')
const SwaggerParser = require('swagger-parser');
const jsf = require('json-schema-faker');
const { forEach } = require('lodash')

const app = express();
const paramUrlRegex = /\{([^\{]*)\}/g

const doMockServer = async (path) => {
  let swaggerDoc = await SwaggerParser.parse(path)
  swaggerDoc = await SwaggerParser.dereference(swaggerDoc)
  mocking(swaggerDoc)
  app.listen(3000)
  console.log('pampas api mocker started, listen on 3000')
}

const mocking = (swaggerDoc) => {
  forEach(swaggerDoc.paths, (methods, path) => {
    const apiPath = path.replace(paramUrlRegex, ':$1')
    forEach(methods, (info, method) => {
      addRoute(apiPath, method, info)
    })
  })
}

const addRoute = (apiPath, method, info) => {
  const { parameters, responses } = info
  const responseMap = buildResponseMap(responses)
  app[method](apiPath, (req, res) => {
    const code = req.query['__code']
    if (code && responseMap[code]) {
      res.send(responseMap[code])
    } else {
      res.send(responseMap[200] || Object.values(responseMap)[0])
    }
  })
}

const buildResponseMap = (responses) => {
  const responseMap = {}
  forEach(responses, async (response, code) => {
    if (response.schema) {
      requireAllProperties(response.schema);
      const data = await jsf(response.schema)
      responseMap[code] = data
    }
  })
  return responseMap
}

function requireAllProperties(definition) {
  if (definition && !definition.required) {
    if (definition.properties) {
      definition.required = Object.keys(definition.properties)
      forEach(definition.required, key => requireAllProperties(definition.properties[key]))
    } else {
      definition.required = Object.keys(definition).filter(key => key !== 'type')
      forEach(definition.required, key => requireAllProperties(definition[key]))
    }
  }
}

doMockServer('./examples/swagger.json')