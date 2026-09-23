@description('Región de los recursos')
param location string

param namePrefix string
param suffix string

@secure()
param postgresAdminPassword string

@secure()
param jwtSecret string

@secure()
param openAiApiKey string = ''

param appServiceSku string = 'F1'

var serverName = '${namePrefix}-pg-${suffix}'
var appName = '${namePrefix}-api-${suffix}'
var planName = '${namePrefix}-plan-${suffix}'
var swaName = '${namePrefix}-web-${suffix}'
var insightsName = '${namePrefix}-ai-${suffix}'

resource plan 'Microsoft.Web/serverfarms@2024-04-01' = {
  name: planName
  location: location
  sku: {
    name: appServiceSku
    tier: appServiceSku == 'F1' ? 'Free' : 'Basic'
  }
  kind: 'linux'
  properties: {
    reserved: true
  }
}

resource postgres 'Microsoft.DBforPostgreSQL/flexibleServers@2024-08-01' = {
  name: serverName
  location: location
  sku: {
    name: 'Standard_B1ms'
    tier: 'Burstable'
  }
  properties: {
    version: '16'
    administratorLogin: 'ensayar'
    administratorLoginPassword: postgresAdminPassword
    storage: {
      storageSizeGB: 32
    }
    backup: {
      backupRetentionDays: 7
    }
  }
}

resource database 'Microsoft.DBforPostgreSQL/flexibleServers/databases@2024-08-01' = {
  parent: postgres
  name: 'ensayar'
  properties: {
    charset: 'UTF8'
    collation: 'en_US.utf8'
  }
}

resource firewallAzure 'Microsoft.DBforPostgreSQL/flexibleServers/firewallRules@2024-08-01' = {
  parent: postgres
  name: 'AllowAzureServices'
  properties: {
    startIpAddress: '0.0.0.0'
    endIpAddress: '0.0.0.0'
  }
}

resource workspace 'Microsoft.OperationalInsights/workspaces@2023-09-01' = {
  name: '${namePrefix}-law-${suffix}'
  location: location
  properties: {
    sku: {
      name: 'PerGB2018'
    }
    retentionInDays: 30
  }
}

resource insights 'Microsoft.Insights/components@2020-02-02' = {
  name: insightsName
  location: location
  kind: 'web'
  properties: {
    Application_Type: 'web'
    WorkspaceResourceId: workspace.id
  }
}

resource api 'Microsoft.Web/sites@2024-04-01' = {
  name: appName
  location: location
  kind: 'app,linux'
  identity: {
    type: 'SystemAssigned'
  }
  tags: {
    'azd-service-name': 'api'
  }
  properties: {
    serverFarmId: plan.id
    httpsOnly: true
    siteConfig: {
      linuxFxVersion: 'NODE|20-lts'
      appCommandLine: 'bash startup.sh'
      appSettings: concat([
        {
          name: 'DATABASE_URL'
          value: 'postgresql://ensayar:${postgresAdminPassword}@${postgres.properties.fullyQualifiedDomainName}:5432/ensayar?sslmode=require'
        }
        {
          name: 'JWT_SECRET'
          value: jwtSecret
        }
        {
          name: 'APPLICATIONINSIGHTS_CONNECTION_STRING'
          value: insights.properties.ConnectionString
        }
        {
          name: 'SCM_DO_BUILD_DURING_DEPLOYMENT'
          value: 'true'
        }
        {
          name: 'ENABLE_ORYX_BUILD'
          value: 'true'
        }
        {
          name: 'NPM_CONFIG_PRODUCTION'
          value: 'false'
        }
        {
          name: 'RUN_DEMO_SEED'
          value: 'true'
        }
        {
          name: 'WEBSITE_NODE_DEFAULT_VERSION'
          value: '~20'
        }
      ], openAiApiKey != '' ? [
        {
          name: 'AZURE_OPENAI_ENDPOINT'
          value: 'https://ensayar-openai.openai.azure.com/'
        }
        {
          name: 'AZURE_OPENAI_API_KEY'
          value: openAiApiKey
        }
        {
          name: 'AZURE_OPENAI_DEPLOYMENT'
          value: 'gpt-4.1-mini'
        }
        {
          name: 'AZURE_OPENAI_API_VERSION'
          value: '2024-10-21'
        }
      ] : [])
    }
  }
}

resource web 'Microsoft.Web/sites@2024-04-01' = {
  name: swaName
  location: location
  kind: 'app,linux'
  tags: {
    'azd-service-name': 'web'
  }
  properties: {
    serverFarmId: plan.id
    httpsOnly: true
    siteConfig: {
      linuxFxVersion: 'NODE|20-lts'
      appCommandLine: 'npm start'
      appSettings: [
        {
          name: 'VITE_API_URL'
          value: 'https://${api.properties.defaultHostName}'
        }
        {
          name: 'SCM_DO_BUILD_DURING_DEPLOYMENT'
          value: 'true'
        }
        {
          name: 'ENABLE_ORYX_BUILD'
          value: 'true'
        }
        {
          name: 'WEBSITE_NODE_DEFAULT_VERSION'
          value: '~20'
        }
      ]
    }
  }
}

output apiUrl string = 'https://${api.properties.defaultHostName}'
output webHostname string = web.properties.defaultHostName
output postgresFqdn string = postgres.properties.fullyQualifiedDomainName
