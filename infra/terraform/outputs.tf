output "alb_dns_name" {
  value = aws_lb.main.dns_name
}

output "cognito_user_pool_id" {
  value = aws_cognito_user_pool.main.id
}

output "cognito_client_id" {
  value = aws_cognito_user_pool_client.web.id
}

output "media_bucket" {
  value = aws_s3_bucket.media.bucket
}

output "jobs_queue_url" {
  value = var.enable_job_queue ? aws_sqs_queue.jobs[0].url : null
}

output "database_endpoint" {
  value = aws_db_instance.main.address
}

output "app_secret_arn" {
  description = "Set integration values here (AI_API_KEY, WhatsApp, reconstruction). Never in tfvars."
  value       = aws_secretsmanager_secret.app.arn
}

output "ecs_cluster" {
  value = aws_ecs_cluster.main.name
}

output "migrate_task_definition" {
  value = aws_ecs_task_definition.migrate.family
}

output "private_subnet_ids" {
  value = aws_subnet.private[*].id
}

output "task_security_group_id" {
  value = aws_security_group.tasks.id
}
