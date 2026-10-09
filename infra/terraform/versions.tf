terraform {
  required_version = ">= 1.6.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.70"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.6"
    }
  }
  # Fill the bucket after the state backend exists. Do not commit state files.
  # backend "s3" {
  #   bucket         = "REPLACE_ACCOUNT-estateflow-tfstate"
  #   key            = "estateflow/terraform.tfstate"
  #   region         = "REPLACE_REGION"
  #   dynamodb_table = "estateflow-tf-locks"
  #   encrypt        = true
  # }
}

provider "aws" {
  region = var.region
  default_tags {
    tags = {
      Application = "estateflow"
      Environment = var.environment
      ManagedBy   = "terraform"
    }
  }
}
