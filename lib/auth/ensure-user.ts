import { currentUser } from '@clerk/nextjs/server'
import { userOperations } from '@/lib/db/helpers'
import type { User, UserInsert } from '@/lib/types/database'

/**
 * Ensures that the current authenticated user exists in the Supabase database.
 * Creates the user if they don't exist, or returns the existing user.
 * This function should be called at the beginning of any server action or API route
 * that needs to access user data from Supabase.
 */
export async function ensureUser(): Promise<User | null> {
  try {
    // Get the current user from Clerk
    const clerkUser = await currentUser()
    
    if (!clerkUser) {
      return null
    }

    // Try to get the user from Supabase
    let user: User
    
    try {
      user = await userOperations.getByClerkId(clerkUser.id)
    } catch (error) {
      // User doesn't exist in Supabase, create them
      console.log('User not found in Supabase, creating...', clerkUser.id)
      
      const userData: UserInsert = {
        clerk_id: clerkUser.id,
        subscription_tier: 'free',
        credits_remaining: 100, // Initial free credits
        settings: {
          email_notifications: true,
          research_preferences: {
            enabled: true,
            depth: 'moderate',
            fact_checking: true,
            sources_required: 3
          }
        }
      }

      try {
        user = await userOperations.create(userData)
        console.log('User created in Supabase:', user.id)
      } catch (createError) {
        // Handle race condition where user might have been created by webhook
        console.log('User creation failed, trying to fetch again...')
        user = await userOperations.getByClerkId(clerkUser.id)
      }
    }

    return user
  } catch (error) {
    console.error('Error ensuring user exists:', error)
    return null
  }
}

/**
 * Gets the current user from Supabase, throwing an error if not found.
 * Use this in API routes where authentication is required.
 */
export async function requireUser(): Promise<User> {
  const user = await ensureUser()
  
  if (!user) {
    throw new Error('Unauthorized: User not found')
  }
  
  return user
}

/**
 * Checks if the current user has sufficient credits for an operation.
 * @param requiredCredits The number of credits required
 * @returns The user if they have sufficient credits, throws otherwise
 */
export async function requireCredits(requiredCredits: number = 1): Promise<User> {
  const user = await requireUser()
  
  if (user.credits_remaining < requiredCredits) {
    throw new Error('Insufficient credits')
  }
  
  return user
}

/**
 * Deducts credits from the user's account.
 * @param userId The user's ID in Supabase
 * @param credits The number of credits to deduct
 * @returns The updated user
 */
export async function deductCredits(userId: string, credits: number): Promise<User> {
  const user = await userOperations.getByClerkId(userId)
  
  if (!user) {
    throw new Error('User not found')
  }
  
  const newCredits = Math.max(0, user.credits_remaining - credits)
  
  return await userOperations.updateCredits(user.id, newCredits)
}
