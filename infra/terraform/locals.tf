locals {
  name     = "estateflow-${var.environment}"
  is_prod  = var.environment == "prod"
  app_env  = local.is_prod ? "production" : "staging"
  log_days = coalesce(var.log_retention_days, local.is_prod ? 90 : 14)

  # Keys the API reads from the Secrets Manager app secret. Values start empty and are set by an operator.
  app_secret_keys = [
    "AI_API_KEY",
    "HF_TOKEN",
    "WHATSAPP_ACCESS_TOKEN",
    "WHATSAPP_WEBHOOK_VERIFY_TOKEN",
    "META_APP_SECRET",
    "RECONSTRUCTION_API_KEY",
    "RECONSTRUCTION_WEBHOOK_SECRET",
  ]

  use_local_auth = var.auth_provider == "local"
}

check "prod_uses_cognito" {
  assert {
    condition     = !(local.is_prod && var.auth_provider != "cognito")
    error_message = "prod must use auth_provider = \"cognito\". The API also refuses to start otherwise."
  }
}
