variable "environment" {
  type = string
  validation {
    condition     = contains(["dev", "staging", "prod"], var.environment)
    error_message = "environment must be dev, staging, or prod."
  }
}

variable "region" {
  type = string
}

variable "domain_name" {
  type        = string
  description = "Public site hostname, for example app.example.com. Placeholder only."
}

variable "api_domain_name" {
  type = string
}

variable "certificate_arn" {
  type        = string
  description = "Existing ACM certificate in this region covering domain_name and api_domain_name. Terraform does not request one."
}

variable "vpc_cidr" {
  type    = string
  default = "10.40.0.0/16"
}

variable "db_instance_class" {
  type    = string
  default = "db.t4g.micro"
}

variable "db_multi_az" {
  type    = bool
  default = false
}

variable "db_allocated_storage_gb" {
  type    = number
  default = 20
}

variable "db_max_allocated_storage_gb" {
  type        = number
  default     = 100
  description = "Storage autoscaling ceiling. Set equal to db_allocated_storage_gb to disable autoscaling."
}

variable "deletion_protection" {
  type    = bool
  default = false
}

variable "web_image" {
  type        = string
  description = "Web image built with --build-arg API_URL=https://<api_domain_name> and NEXT_PUBLIC_APP_ENV matching this environment."
}

variable "api_image" {
  type = string
}

variable "app_version" {
  type        = string
  default     = "unset"
  description = "Image tag or git SHA, reported by /health so a rollback target is visible."
}

variable "alarm_email" {
  type        = string
  description = "Address for alarm notifications. Confirm the SNS subscription before relying on it."
}

variable "auth_provider" {
  type        = string
  default     = "cognito"
  description = "cognito or local. The API refuses to start in prod unless this is cognito. local is allowed only for dev/staging."
  validation {
    condition     = contains(["cognito", "local"], var.auth_provider)
    error_message = "auth_provider must be cognito or local."
  }
}

variable "enable_job_queue" {
  type        = bool
  default     = false
  description = "Create the SQS queue and DLQ. Leave false until a worker consumes it; the API does not yet."
}

variable "api_config" {
  type        = map(string)
  default     = {}
  description = "Non-secret API settings, e.g. AI_PROVIDER, AI_BASE_URL, AI_MODEL, RECONSTRUCTION_PROVIDER. Secrets go in the app secret, never here."
  validation {
    condition = alltrue([
      for k in keys(var.api_config) : !can(regex("(KEY|TOKEN|SECRET|PASSWORD|DATABASE_URL)", k))
    ])
    error_message = "api_config must not contain secret-looking keys. Put secrets in the Secrets Manager app secret."
  }
}

variable "api_cpu" {
  type    = number
  default = 256
}

variable "api_memory" {
  type    = number
  default = 512
}

variable "web_cpu" {
  type    = number
  default = 256
}

variable "web_memory" {
  type    = number
  default = 512
}

variable "log_retention_days" {
  type        = number
  default     = null
  description = "Overrides the default of 90 days in prod and 14 elsewhere."
}
