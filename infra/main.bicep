targetScope = 'subscription'

@description('Prefijo corto de recursos')
param namePrefix string = 'ensayar'

@description('Región. Confirmar con el dueño antes de provisionar.')
param location string = 'brazilsouth'

@secure()
@description('Clave del admin de PostgreSQL. No commitear el valor.')
param postgresAdminPassword string

@secure()
@description('Secreto JWT de la API')
param jwtSecret string

@secure()
@description('Clave de Azure OpenAI. Vacía si el modelo todavía no está conectado.')
param openAiApiKey string = ''

@description('SKU de App Service. F1 es gratuito académico.')
param appServiceSku string = 'F1'

var suffix = uniqueString(subscription().subscriptionId, location)
var rgName = '${namePrefix}-rg-${suffix}'

resource rg 'Microsoft.Resources/resourceGroups@2024-03-01' = {
  name: rgName
  location: location
}

module app 'app.bicep' = {
  name: 'ensayar-app'
  scope: rg
  params: {
    location: location
    namePrefix: namePrefix
    suffix: suffix
    postgresAdminPassword: postgresAdminPassword
    jwtSecret: jwtSecret
    openAiApiKey: openAiApiKey
    appServiceSku: appServiceSku
  }
}

output apiUrl string = app.outputs.apiUrl
output VITE_API_URL string = app.outputs.apiUrl
output webHostname string = app.outputs.webHostname
output postgresFqdn string = app.outputs.postgresFqdn
