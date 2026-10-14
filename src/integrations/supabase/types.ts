export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      achievements: {
        Row: {
          code: string
          created_at: string
          criteria: string | null
          description: string | null
          division: Database["public"]["Enums"]["division_slug"] | null
          icon: string | null
          id: string
          name: string
          points_threshold: number | null
          tier: string
        }
        Insert: {
          code: string
          created_at?: string
          criteria?: string | null
          description?: string | null
          division?: Database["public"]["Enums"]["division_slug"] | null
          icon?: string | null
          id?: string
          name: string
          points_threshold?: number | null
          tier?: string
        }
        Update: {
          code?: string
          created_at?: string
          criteria?: string | null
          description?: string | null
          division?: Database["public"]["Enums"]["division_slug"] | null
          icon?: string | null
          id?: string
          name?: string
          points_threshold?: number | null
          tier?: string
        }
        Relationships: []
      }
      activity_logs: {
        Row: {
          action: string
          actor_id: string | null
          actor_name: string | null
          created_at: string
          entity: string
          entity_id: string | null
          id: string
          meta: Json
          new_value: Json | null
          old_value: Json | null
          summary: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          actor_name?: string | null
          created_at?: string
          entity: string
          entity_id?: string | null
          id?: string
          meta?: Json
          new_value?: Json | null
          old_value?: Json | null
          summary: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          actor_name?: string | null
          created_at?: string
          entity?: string
          entity_id?: string | null
          id?: string
          meta?: Json
          new_value?: Json | null
          old_value?: Json | null
          summary?: string
        }
        Relationships: []
      }
      announcements: {
        Row: {
          author_id: string | null
          body: string
          created_at: string
          deleted_at: string | null
          division: Database["public"]["Enums"]["division_slug"] | null
          id: string
          pinned: boolean
          publish_at: string | null
          review_note: string | null
          review_status: string
          reviewed_at: string | null
          reviewed_by: string | null
          submitted_by: string | null
          title: string
        }
        Insert: {
          author_id?: string | null
          body: string
          created_at?: string
          deleted_at?: string | null
          division?: Database["public"]["Enums"]["division_slug"] | null
          id?: string
          pinned?: boolean
          publish_at?: string | null
          review_note?: string | null
          review_status?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          submitted_by?: string | null
          title: string
        }
        Update: {
          author_id?: string | null
          body?: string
          created_at?: string
          deleted_at?: string | null
          division?: Database["public"]["Enums"]["division_slug"] | null
          id?: string
          pinned?: boolean
          publish_at?: string | null
          review_note?: string | null
          review_status?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          submitted_by?: string | null
          title?: string
        }
        Relationships: []
      }
      attendance: {
        Row: {
          attended_on: string
          created_at: string
          id: string
          meeting_label: string | null
          recorded_by: string | null
          user_id: string
        }
        Insert: {
          attended_on: string
          created_at?: string
          id?: string
          meeting_label?: string | null
          recorded_by?: string | null
          user_id: string
        }
        Update: {
          attended_on?: string
          created_at?: string
          id?: string
          meeting_label?: string | null
          recorded_by?: string | null
          user_id?: string
        }
        Relationships: []
      }
      booking_status_history: {
        Row: {
          booking_id: string
          changed_by: string | null
          created_at: string
          from_status: string | null
          id: string
          note: string | null
          to_status: string
        }
        Insert: {
          booking_id: string
          changed_by?: string | null
          created_at?: string
          from_status?: string | null
          id?: string
          note?: string | null
          to_status: string
        }
        Update: {
          booking_id?: string
          changed_by?: string | null
          created_at?: string
          from_status?: string | null
          id?: string
          note?: string | null
          to_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "booking_status_history_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      bookings: {
        Row: {
          assigned_divisions: string[]
          audience_size: number | null
          completion_note: string | null
          contact_person: string
          created_at: string
          email: string | null
          event_date: string
          event_name: string
          event_time: string | null
          event_type: string | null
          id: string
          kind: Database["public"]["Enums"]["booking_kind"]
          media_links: Json
          notes: string | null
          organization: string
          priority: string
          rejection_reason: string | null
          services: string[]
          status: Database["public"]["Enums"]["booking_status"]
          updated_at: string
          venue: string | null
          whatsapp: string
        }
        Insert: {
          assigned_divisions?: string[]
          audience_size?: number | null
          completion_note?: string | null
          contact_person: string
          created_at?: string
          email?: string | null
          event_date: string
          event_name: string
          event_time?: string | null
          event_type?: string | null
          id?: string
          kind: Database["public"]["Enums"]["booking_kind"]
          media_links?: Json
          notes?: string | null
          organization: string
          priority?: string
          rejection_reason?: string | null
          services?: string[]
          status?: Database["public"]["Enums"]["booking_status"]
          updated_at?: string
          venue?: string | null
          whatsapp: string
        }
        Update: {
          assigned_divisions?: string[]
          audience_size?: number | null
          completion_note?: string | null
          contact_person?: string
          created_at?: string
          email?: string | null
          event_date?: string
          event_name?: string
          event_time?: string | null
          event_type?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["booking_kind"]
          media_links?: Json
          notes?: string | null
          organization?: string
          priority?: string
          rejection_reason?: string | null
          services?: string[]
          status?: Database["public"]["Enums"]["booking_status"]
          updated_at?: string
          venue?: string | null
          whatsapp?: string
        }
        Relationships: []
      }
      contact_messages: {
        Row: {
          created_at: string
          email: string | null
          handled: boolean
          id: string
          message: string
          name: string
          subject: string | null
          whatsapp: string | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          handled?: boolean
          id?: string
          message: string
          name: string
          subject?: string | null
          whatsapp?: string | null
        }
        Update: {
          created_at?: string
          email?: string | null
          handled?: boolean
          id?: string
          message?: string
          name?: string
          subject?: string | null
          whatsapp?: string | null
        }
        Relationships: []
      }
      contributions: {
        Row: {
          created_at: string
          division: Database["public"]["Enums"]["division_slug"] | null
          event_id: string | null
          evidence_url: string | null
          id: string
          kind: Database["public"]["Enums"]["contribution_kind"]
          note: string | null
          review_note: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["contribution_status"]
          user_id: string
        }
        Insert: {
          created_at?: string
          division?: Database["public"]["Enums"]["division_slug"] | null
          event_id?: string | null
          evidence_url?: string | null
          id?: string
          kind: Database["public"]["Enums"]["contribution_kind"]
          note?: string | null
          review_note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["contribution_status"]
          user_id: string
        }
        Update: {
          created_at?: string
          division?: Database["public"]["Enums"]["division_slug"] | null
          event_id?: string | null
          evidence_url?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["contribution_kind"]
          note?: string | null
          review_note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["contribution_status"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contributions_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      coverage_assignments: {
        Row: {
          assigned_by: string | null
          booking_id: string
          created_at: string
          division: Database["public"]["Enums"]["division_slug"] | null
          id: string
          note: string | null
          service: string | null
          status: string
          user_id: string
        }
        Insert: {
          assigned_by?: string | null
          booking_id: string
          created_at?: string
          division?: Database["public"]["Enums"]["division_slug"] | null
          id?: string
          note?: string | null
          service?: string | null
          status?: string
          user_id: string
        }
        Update: {
          assigned_by?: string | null
          booking_id?: string
          created_at?: string
          division?: Database["public"]["Enums"]["division_slug"] | null
          id?: string
          note?: string | null
          service?: string | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "coverage_assignments_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      divisions: {
        Row: {
          cover_image: string | null
          created_at: string
          description: string | null
          display_order: number | null
          name: string
          responsibilities: string | null
          slug: Database["public"]["Enums"]["division_slug"]
        }
        Insert: {
          cover_image?: string | null
          created_at?: string
          description?: string | null
          display_order?: number | null
          name: string
          responsibilities?: string | null
          slug: Database["public"]["Enums"]["division_slug"]
        }
        Update: {
          cover_image?: string | null
          created_at?: string
          description?: string | null
          display_order?: number | null
          name?: string
          responsibilities?: string | null
          slug?: Database["public"]["Enums"]["division_slug"]
        }
        Relationships: []
      }
      email_templates: {
        Row: {
          body_html: string
          key: string
          label: string
          subject: string
          updated_at: string
        }
        Insert: {
          body_html: string
          key: string
          label: string
          subject: string
          updated_at?: string
        }
        Update: {
          body_html?: string
          key?: string
          label?: string
          subject?: string
          updated_at?: string
        }
        Relationships: []
      }
      event_participants: {
        Row: {
          created_at: string
          division: Database["public"]["Enums"]["division_slug"] | null
          event_id: string
          id: string
          is_lead: boolean
          reviewed_at: string | null
          reviewed_by: string | null
          role: string | null
          status: Database["public"]["Enums"]["event_participation_status"]
          user_id: string
        }
        Insert: {
          created_at?: string
          division?: Database["public"]["Enums"]["division_slug"] | null
          event_id: string
          id?: string
          is_lead?: boolean
          reviewed_at?: string | null
          reviewed_by?: string | null
          role?: string | null
          status?: Database["public"]["Enums"]["event_participation_status"]
          user_id: string
        }
        Update: {
          created_at?: string
          division?: Database["public"]["Enums"]["division_slug"] | null
          event_id?: string
          id?: string
          is_lead?: boolean
          reviewed_at?: string | null
          reviewed_by?: string | null
          role?: string | null
          status?: Database["public"]["Enums"]["event_participation_status"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_participants_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          album_url: string | null
          category: string | null
          cover_image: string | null
          created_at: string
          created_by: string | null
          description: string | null
          event_date: string
          event_size: string
          highlight_video_url: string | null
          id: string
          is_public: boolean
          livestream_url: string | null
          location: string | null
          name: string
          slug: string | null
        }
        Insert: {
          album_url?: string | null
          category?: string | null
          cover_image?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          event_date: string
          event_size?: string
          highlight_video_url?: string | null
          id?: string
          is_public?: boolean
          livestream_url?: string | null
          location?: string | null
          name: string
          slug?: string | null
        }
        Update: {
          album_url?: string | null
          category?: string | null
          cover_image?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          event_date?: string
          event_size?: string
          highlight_video_url?: string | null
          id?: string
          is_public?: boolean
          livestream_url?: string | null
          location?: string | null
          name?: string
          slug?: string | null
        }
        Relationships: []
      }
      featured_members: {
        Row: {
          active: boolean
          bio: string | null
          board_category: string
          created_at: string
          display_order: number
          division: string
          full_name: string
          grade: string | null
          id: string
          member_user_id: string | null
          photo_url: string | null
          points: number
          rank: number
          role_title: string
          section: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          bio?: string | null
          board_category?: string
          created_at?: string
          display_order?: number
          division: string
          full_name: string
          grade?: string | null
          id?: string
          member_user_id?: string | null
          photo_url?: string | null
          points?: number
          rank: number
          role_title: string
          section?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          bio?: string | null
          board_category?: string
          created_at?: string
          display_order?: number
          division?: string
          full_name?: string
          grade?: string | null
          id?: string
          member_user_id?: string | null
          photo_url?: string | null
          points?: number
          rank?: number
          role_title?: string
          section?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      gallery_items: {
        Row: {
          category: Database["public"]["Enums"]["gallery_category"]
          created_at: string
          created_by: string | null
          deleted_at: string | null
          event_date: string | null
          event_id: string | null
          external_url: string | null
          featured: boolean
          id: string
          image_url: string
          media_type: string
          project_id: string | null
          review_note: string | null
          review_status: string
          reviewed_at: string | null
          reviewed_by: string | null
          submitted_by: string | null
          title: string | null
          video_url: string | null
        }
        Insert: {
          category: Database["public"]["Enums"]["gallery_category"]
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          event_date?: string | null
          event_id?: string | null
          external_url?: string | null
          featured?: boolean
          id?: string
          image_url: string
          media_type?: string
          project_id?: string | null
          review_note?: string | null
          review_status?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          submitted_by?: string | null
          title?: string | null
          video_url?: string | null
        }
        Update: {
          category?: Database["public"]["Enums"]["gallery_category"]
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          event_date?: string | null
          event_id?: string | null
          external_url?: string | null
          featured?: boolean
          id?: string
          image_url?: string
          media_type?: string
          project_id?: string | null
          review_note?: string | null
          review_status?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          submitted_by?: string | null
          title?: string | null
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gallery_items_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gallery_items_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      letter_templates: {
        Row: {
          active: boolean
          created_at: string
          id: string
          letterhead_image_url: string | null
          name: string
          storage_path: string
          updated_at: string
          uploaded_by: string | null
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          letterhead_image_url?: string | null
          name: string
          storage_path: string
          updated_at?: string
          uploaded_by?: string | null
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          letterhead_image_url?: string | null
          name?: string
          storage_path?: string
          updated_at?: string
          uploaded_by?: string | null
        }
        Relationships: []
      }
      live_streams: {
        Row: {
          created_at: string
          credits: Json
          description: string | null
          display_order: number
          facebook_url: string | null
          id: string
          published: boolean
          scheduled_at: string | null
          state: string
          thumbnail_url: string | null
          title: string
          updated_at: string
          youtube_url: string | null
        }
        Insert: {
          created_at?: string
          credits?: Json
          description?: string | null
          display_order?: number
          facebook_url?: string | null
          id?: string
          published?: boolean
          scheduled_at?: string | null
          state?: string
          thumbnail_url?: string | null
          title: string
          updated_at?: string
          youtube_url?: string | null
        }
        Update: {
          created_at?: string
          credits?: Json
          description?: string | null
          display_order?: number
          facebook_url?: string | null
          id?: string
          published?: boolean
          scheduled_at?: string | null
          state?: string
          thumbnail_url?: string | null
          title?: string
          updated_at?: string
          youtube_url?: string | null
        }
        Relationships: []
      }
      login_attempts: {
        Row: {
          created_at: string
          email: string
          id: string
          ip: string | null
          reason: string | null
          success: boolean
          user_agent: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          ip?: string | null
          reason?: string | null
          success: boolean
          user_agent?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          ip?: string | null
          reason?: string | null
          success?: boolean
          user_agent?: string | null
        }
        Relationships: []
      }
      media_items: {
        Row: {
          caption: string | null
          caption_writer_id: string | null
          created_at: string
          edited_url: string | null
          editor_id: string | null
          event_id: string | null
          id: string
          notes: string | null
          project_id: string | null
          raw_url: string | null
          status: Database["public"]["Enums"]["media_status"]
          title: string
          updated_at: string
          uploader_id: string
        }
        Insert: {
          caption?: string | null
          caption_writer_id?: string | null
          created_at?: string
          edited_url?: string | null
          editor_id?: string | null
          event_id?: string | null
          id?: string
          notes?: string | null
          project_id?: string | null
          raw_url?: string | null
          status?: Database["public"]["Enums"]["media_status"]
          title: string
          updated_at?: string
          uploader_id: string
        }
        Update: {
          caption?: string | null
          caption_writer_id?: string | null
          created_at?: string
          edited_url?: string | null
          editor_id?: string | null
          event_id?: string | null
          id?: string
          notes?: string | null
          project_id?: string | null
          raw_url?: string | null
          status?: Database["public"]["Enums"]["media_status"]
          title?: string
          updated_at?: string
          uploader_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "media_items_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "media_items_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      member_achievements: {
        Row: {
          achievement_id: string
          awarded_at: string
          awarded_by: string | null
          id: string
          note: string | null
          season: string | null
          user_id: string
        }
        Insert: {
          achievement_id: string
          awarded_at?: string
          awarded_by?: string | null
          id?: string
          note?: string | null
          season?: string | null
          user_id: string
        }
        Update: {
          achievement_id?: string
          awarded_at?: string
          awarded_by?: string | null
          id?: string
          note?: string | null
          season?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "member_achievements_achievement_id_fkey"
            columns: ["achievement_id"]
            isOneToOne: false
            referencedRelation: "achievements"
            referencedColumns: ["id"]
          },
        ]
      }
      member_onboarding: {
        Row: {
          created_at: string
          created_by: string | null
          email_authorized_at: string | null
          email_authorized_by: string | null
          email_error: string | null
          email_sent_at: string | null
          email_status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          email_authorized_at?: string | null
          email_authorized_by?: string | null
          email_error?: string | null
          email_sent_at?: string | null
          email_status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          email_authorized_at?: string | null
          email_authorized_by?: string | null
          email_error?: string | null
          email_sent_at?: string | null
          email_status?: string
          user_id?: string
        }
        Relationships: []
      }
      member_skills: {
        Row: {
          assigned_by: string | null
          division: Database["public"]["Enums"]["division_slug"]
          id: string
          tier: Database["public"]["Enums"]["skill_tier"]
          updated_at: string
          user_id: string
        }
        Insert: {
          assigned_by?: string | null
          division: Database["public"]["Enums"]["division_slug"]
          id?: string
          tier?: Database["public"]["Enums"]["skill_tier"]
          updated_at?: string
          user_id: string
        }
        Update: {
          assigned_by?: string | null
          division?: Database["public"]["Enums"]["division_slug"]
          id?: string
          tier?: Database["public"]["Enums"]["skill_tier"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      missing_event_requests: {
        Row: {
          created_at: string
          description: string | null
          event_date: string | null
          id: string
          name: string
          requested_by: string
          reviewed_by: string | null
          status: Database["public"]["Enums"]["event_participation_status"]
        }
        Insert: {
          created_at?: string
          description?: string | null
          event_date?: string | null
          id?: string
          name: string
          requested_by: string
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["event_participation_status"]
        }
        Update: {
          created_at?: string
          description?: string | null
          event_date?: string | null
          id?: string
          name?: string
          requested_by?: string
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["event_participation_status"]
        }
        Relationships: []
      }
      notification_rules: {
        Row: {
          active: boolean
          conditions: Json
          created_at: string
          deliver_email: boolean
          deliver_portal: boolean
          id: string
          name: string
          priority: string
          recipient_divisions: string[]
          recipient_roles: string[]
          recipient_user_ids: string[]
          trigger_key: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          conditions?: Json
          created_at?: string
          deliver_email?: boolean
          deliver_portal?: boolean
          id?: string
          name: string
          priority?: string
          recipient_divisions?: string[]
          recipient_roles?: string[]
          recipient_user_ids?: string[]
          trigger_key: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          conditions?: Json
          created_at?: string
          deliver_email?: boolean
          deliver_portal?: boolean
          id?: string
          name?: string
          priority?: string
          recipient_divisions?: string[]
          recipient_roles?: string[]
          recipient_user_ids?: string[]
          trigger_key?: string
          updated_at?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          kind: string
          link: string | null
          priority: string
          read_at: string | null
          title: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          kind?: string
          link?: string | null
          priority?: string
          read_at?: string | null
          title: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          kind?: string
          link?: string | null
          priority?: string
          read_at?: string | null
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      permission_roles: {
        Row: {
          active: boolean
          created_at: string
          description: string | null
          id: string
          key: string
          name: string
          permissions: string[]
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          description?: string | null
          id?: string
          key: string
          name: string
          permissions?: string[]
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          description?: string | null
          id?: string
          key?: string
          name?: string
          permissions?: string[]
          updated_at?: string
        }
        Relationships: []
      }
      point_rules: {
        Row: {
          kind: string
          label: string
          points: number
          updated_at: string
        }
        Insert: {
          kind: string
          label: string
          points?: number
          updated_at?: string
        }
        Update: {
          kind?: string
          label?: string
          points?: number
          updated_at?: string
        }
        Relationships: []
      }
      points_log: {
        Row: {
          contribution_id: string | null
          created_at: string
          division: Database["public"]["Enums"]["division_slug"] | null
          id: string
          kind: Database["public"]["Enums"]["contribution_kind"]
          points: number
          user_id: string
        }
        Insert: {
          contribution_id?: string | null
          created_at?: string
          division?: Database["public"]["Enums"]["division_slug"] | null
          id?: string
          kind: Database["public"]["Enums"]["contribution_kind"]
          points: number
          user_id: string
        }
        Update: {
          contribution_id?: string | null
          created_at?: string
          division?: Database["public"]["Enums"]["division_slug"] | null
          id?: string
          kind?: Database["public"]["Enums"]["contribution_kind"]
          points?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "points_log_contribution_id_fkey"
            columns: ["contribution_id"]
            isOneToOne: false
            referencedRelation: "contributions"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          active: boolean
          admission_number: string | null
          bio: string | null
          class: string | null
          created_at: string
          email: string | null
          full_name: string
          grade: string | null
          id: string
          join_date: string | null
          past_works: string | null
          photo_url: string | null
          primary_division: Database["public"]["Enums"]["division_slug"] | null
          updated_at: string
          whatsapp: string | null
        }
        Insert: {
          active?: boolean
          admission_number?: string | null
          bio?: string | null
          class?: string | null
          created_at?: string
          email?: string | null
          full_name?: string
          grade?: string | null
          id: string
          join_date?: string | null
          past_works?: string | null
          photo_url?: string | null
          primary_division?: Database["public"]["Enums"]["division_slug"] | null
          updated_at?: string
          whatsapp?: string | null
        }
        Update: {
          active?: boolean
          admission_number?: string | null
          bio?: string | null
          class?: string | null
          created_at?: string
          email?: string | null
          full_name?: string
          grade?: string | null
          id?: string
          join_date?: string | null
          past_works?: string | null
          photo_url?: string | null
          primary_division?: Database["public"]["Enums"]["division_slug"] | null
          updated_at?: string
          whatsapp?: string | null
        }
        Relationships: []
      }
      projects: {
        Row: {
          cover_image: string | null
          created_at: string
          deleted_at: string | null
          description: string | null
          event_date: string | null
          id: string
          is_featured: boolean
          publish_at: string | null
          published: boolean
          review_note: string | null
          review_status: string
          reviewed_at: string | null
          reviewed_by: string | null
          slug: string
          submitted_by: string | null
          summary: string | null
          title: string
          updated_at: string
        }
        Insert: {
          cover_image?: string | null
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          event_date?: string | null
          id?: string
          is_featured?: boolean
          publish_at?: string | null
          published?: boolean
          review_note?: string | null
          review_status?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          slug: string
          submitted_by?: string | null
          summary?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          cover_image?: string | null
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          event_date?: string | null
          id?: string
          is_featured?: boolean
          publish_at?: string | null
          published?: boolean
          review_note?: string | null
          review_status?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          slug?: string
          submitted_by?: string | null
          summary?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      release_letter_members: {
        Row: {
          class_name: string
          created_at: string
          full_name: string
          id: string
          letter_id: string
          member_user_id: string | null
          position: number
        }
        Insert: {
          class_name?: string
          created_at?: string
          full_name: string
          id?: string
          letter_id: string
          member_user_id?: string | null
          position?: number
        }
        Update: {
          class_name?: string
          created_at?: string
          full_name?: string
          id?: string
          letter_id?: string
          member_user_id?: string | null
          position?: number
        }
        Relationships: [
          {
            foreignKeyName: "release_letter_members_letter_id_fkey"
            columns: ["letter_id"]
            isOneToOne: false
            referencedRelation: "release_letters"
            referencedColumns: ["id"]
          },
        ]
      }
      release_letters: {
        Row: {
          body: string
          created_at: string
          created_by: string | null
          docx_path: string | null
          event_name: string
          generated_at: string | null
          id: string
          intro_line: string | null
          letter_date: string
          pdf_path: string | null
          ref_no: string
          status: string
          template_id: string | null
          updated_at: string
        }
        Insert: {
          body?: string
          created_at?: string
          created_by?: string | null
          docx_path?: string | null
          event_name: string
          generated_at?: string | null
          id?: string
          intro_line?: string | null
          letter_date?: string
          pdf_path?: string | null
          ref_no: string
          status?: string
          template_id?: string | null
          updated_at?: string
        }
        Update: {
          body?: string
          created_at?: string
          created_by?: string | null
          docx_path?: string | null
          event_name?: string
          generated_at?: string | null
          id?: string
          intro_line?: string | null
          letter_date?: string
          pdf_path?: string | null
          ref_no?: string
          status?: string
          template_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "release_letters_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "letter_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      services: {
        Row: {
          active: boolean
          created_at: string
          display_order: number
          division: Database["public"]["Enums"]["division_slug"]
          key: string
          label: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          display_order?: number
          division: Database["public"]["Enums"]["division_slug"]
          key: string
          label: string
        }
        Update: {
          active?: boolean
          created_at?: string
          display_order?: number
          division?: Database["public"]["Enums"]["division_slug"]
          key?: string
          label?: string
        }
        Relationships: []
      }
      site_settings: {
        Row: {
          about_eyebrow: string
          about_history: string
          about_intro: string
          about_milestones: Json
          about_timeline: Json
          about_title: string
          address_line: string
          contact_intro: string
          divisions_intro: string
          divisions_title: string
          email_address: string
          facebook_url: string
          footer_note: string
          gallery_intro: string
          hero_cta_href: string
          hero_cta_label: string
          hero_eyebrow: string
          hero_subtitle: string
          hero_title: string
          id: number
          leadership_intro: string
          live_stream_active: boolean
          live_stream_title: string | null
          live_stream_url: string | null
          mediaflow_url: string
          projects_intro: string
          tiktok_url: string
          updated_at: string
          whatsapp_channel_url: string
          whatsapp_number: string
          whatsapp_url: string
          youtube_url: string
        }
        Insert: {
          about_eyebrow?: string
          about_history?: string
          about_intro?: string
          about_milestones?: Json
          about_timeline?: Json
          about_title?: string
          address_line?: string
          contact_intro?: string
          divisions_intro?: string
          divisions_title?: string
          email_address?: string
          facebook_url?: string
          footer_note?: string
          gallery_intro?: string
          hero_cta_href?: string
          hero_cta_label?: string
          hero_eyebrow?: string
          hero_subtitle?: string
          hero_title?: string
          id?: number
          leadership_intro?: string
          live_stream_active?: boolean
          live_stream_title?: string | null
          live_stream_url?: string | null
          mediaflow_url?: string
          projects_intro?: string
          tiktok_url?: string
          updated_at?: string
          whatsapp_channel_url?: string
          whatsapp_number?: string
          whatsapp_url?: string
          youtube_url?: string
        }
        Update: {
          about_eyebrow?: string
          about_history?: string
          about_intro?: string
          about_milestones?: Json
          about_timeline?: Json
          about_title?: string
          address_line?: string
          contact_intro?: string
          divisions_intro?: string
          divisions_title?: string
          email_address?: string
          facebook_url?: string
          footer_note?: string
          gallery_intro?: string
          hero_cta_href?: string
          hero_cta_label?: string
          hero_eyebrow?: string
          hero_subtitle?: string
          hero_title?: string
          id?: number
          leadership_intro?: string
          live_stream_active?: boolean
          live_stream_title?: string | null
          live_stream_url?: string | null
          mediaflow_url?: string
          projects_intro?: string
          tiktok_url?: string
          updated_at?: string
          whatsapp_channel_url?: string
          whatsapp_number?: string
          whatsapp_url?: string
          youtube_url?: string
        }
        Relationships: []
      }
      site_stats: {
        Row: {
          active_members: number
          events_covered: number
          id: number
          live_streams: number
          photos_captured: number
          projects_published: number
          total_members: number
          updated_at: string
          videos_produced: number
        }
        Insert: {
          active_members?: number
          events_covered?: number
          id?: number
          live_streams?: number
          photos_captured?: number
          projects_published?: number
          total_members?: number
          updated_at?: string
          videos_produced?: number
        }
        Update: {
          active_members?: number
          events_covered?: number
          id?: number
          live_streams?: number
          photos_captured?: number
          projects_published?: number
          total_members?: number
          updated_at?: string
          videos_produced?: number
        }
        Relationships: []
      }
      user_permission_roles: {
        Row: {
          assigned_by: string | null
          created_at: string
          id: string
          role_id: string
          user_id: string
        }
        Insert: {
          assigned_by?: string | null
          created_at?: string
          id?: string
          role_id: string
          user_id: string
        }
        Update: {
          assigned_by?: string | null
          created_at?: string
          id?: string
          role_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_permission_roles_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "permission_roles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          division: Database["public"]["Enums"]["division_slug"] | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          division?: Database["public"]["Enums"]["division_slug"] | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          division?: Database["public"]["Enums"]["division_slug"] | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_permission: {
        Args: { _permission: string; _user_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_staff: { Args: { _user_id: string }; Returns: boolean }
      next_mu_number: { Args: never; Returns: string }
      next_release_letter_ref: { Args: never; Returns: string }
      renumber_member_numbers: { Args: never; Returns: undefined }
    }
    Enums: {
      app_role:
        | "member"
        | "section_head"
        | "executive_board"
        | "tic"
        | "administrator"
      booking_kind: "internal" | "inter_school"
      booking_status:
        | "new"
        | "contacted"
        | "under_discussion"
        | "confirmed"
        | "completed"
        | "rejected"
        | "assigned"
        | "in_progress"
        | "media_published"
      contribution_kind:
        | "attend_meeting"
        | "participate_event"
        | "lead_event"
        | "upload_photo"
        | "approved_edit"
        | "approved_caption"
        | "publish_post"
        | "complete_task"
        | "stream_op"
        | "camera_op"
        | "technical_task"
      contribution_status: "pending" | "approved" | "rejected"
      division_slug:
        | "photography"
        | "editing"
        | "videography"
        | "streaming"
        | "technical"
        | "announcing"
        | "social_media"
      event_participation_status: "pending" | "approved" | "rejected"
      gallery_category:
        | "photography"
        | "videography"
        | "behind_the_scenes"
        | "live_productions"
        | "photo_editing"
        | "graphic_design"
        | "live_streaming"
        | "technical"
        | "announcing"
        | "social_media"
        | "events"
        | "sports"
        | "cultural"
        | "portraits"
        | "custom"
      media_status:
        | "uploaded"
        | "editing"
        | "edited"
        | "caption_writing"
        | "review"
        | "approved"
        | "published"
      skill_tier: "beginner" | "intermediate" | "advanced" | "expert"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: [
        "member",
        "section_head",
        "executive_board",
        "tic",
        "administrator",
      ],
      booking_kind: ["internal", "inter_school"],
      booking_status: [
        "new",
        "contacted",
        "under_discussion",
        "confirmed",
        "completed",
        "rejected",
        "assigned",
        "in_progress",
        "media_published",
      ],
      contribution_kind: [
        "attend_meeting",
        "participate_event",
        "lead_event",
        "upload_photo",
        "approved_edit",
        "approved_caption",
        "publish_post",
        "complete_task",
        "stream_op",
        "camera_op",
        "technical_task",
      ],
      contribution_status: ["pending", "approved", "rejected"],
      division_slug: [
        "photography",
        "editing",
        "videography",
        "streaming",
        "technical",
        "announcing",
        "social_media",
      ],
      event_participation_status: ["pending", "approved", "rejected"],
      gallery_category: [
        "photography",
        "videography",
        "behind_the_scenes",
        "live_productions",
        "photo_editing",
        "graphic_design",
        "live_streaming",
        "technical",
        "announcing",
        "social_media",
        "events",
        "sports",
        "cultural",
        "portraits",
        "custom",
      ],
      media_status: [
        "uploaded",
        "editing",
        "edited",
        "caption_writing",
        "review",
        "approved",
        "published",
      ],
      skill_tier: ["beginner", "intermediate", "advanced", "expert"],
    },
  },
} as const
