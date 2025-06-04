import { Injectable, UnauthorizedException } from '@nestjs/common';
import { supabase, supabaseAdmin } from '../config/supabase.config';

@Injectable()
export class UserService {
  async getCurrentUser() {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();
    if (error) {
      throw error;
    }
    if (!user) {
      return null;
    }

    // Ensure user exists in our custom table
    await this.ensureUserExists(user);
    return user;
  }

  private async ensureUserExists(authUser: any) {
    // Check if user exists in our table
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('id', authUser.id)
      .single();

    if (!existingUser) {
      // Create user in our table if doesn't exist using admin client
      const { error: insertError } = await supabaseAdmin.from('users').insert([
        {
          id: authUser.id,
          email: authUser.email,
        },
      ]);

      if (insertError) {
        console.error('Error creating user record:', insertError);
        throw new Error('Failed to create user record');
      }
    }
  }

  async signUp(email: string, password: string) {
    // First, create auth user
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${process.env.PUBLIC_URL || 'http://localhost:3000'}/auth/callback`,
      },
    });

    if (authError) {
      throw authError;
    }

    if (!authData.user) {
      throw new Error('User creation failed');
    }

    // Create user in our table
    await this.ensureUserExists(authData.user);

    return authData;
  }

  async signIn(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      throw error;
    }

    if (!data.user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Ensure user exists in our table
    await this.ensureUserExists(data.user);

    return data;
  }

  async signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) {
      throw error;
    }
  }
}
