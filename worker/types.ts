export interface Env {
  DB: D1Database
  IMAGES: R2Bucket
  ASSETS: Fetcher
  APP_URL: string
  GOOGLE_CLIENT_ID: string
  GOOGLE_CLIENT_SECRET: string
  TOKEN_ENCRYPTION_KEY: string
  SESSION_SECRET: string
  ADMIN_EMAILS?: string
}

export interface UserRow {
  id: string
  email: string
  name: string
  avatar_url: string | null
  google_access_token: string | null
  google_refresh_token: string | null
  token_expires_at: number | null
}

export interface FormRow {
  id: string
  user_id: string
  title: string
  description: string
  slug: string
  questions_json: string
  theme_json: string
  success_message: string
  is_published: number
  sheet_id: string | null
  sheet_url: string | null
  sheet_name: string
  created_at: string
  updated_at: string
  response_count?: number
}

export interface ResponseRow {
  id: string
  form_id: string
  answers_json: string
  sheet_sync_status: string
  sheet_sync_error: string | null
  submitted_at: string
}

export interface Question {
  id: string
  type: string
  label: string
  description?: string
  placeholder?: string
  required?: boolean
  options?: string[]
}

export type AppVariables = { user: UserRow }
