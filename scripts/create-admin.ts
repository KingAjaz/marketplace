/**
 * Create Admin User Script
 * 
 * This script helps you create an admin user.
 * Run with: npx tsx scripts/create-admin.ts <user-email>
 * 
 * Or use Prisma Studio for a visual interface.
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function createAdmin(email: string) {
  try {
    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email },
      include: { roles: true },
    })

    if (!user) {
      console.error(`❌ User with email "${email}" not found.`)
      console.log('\n💡 Please sign up first at /auth/signup')
      process.exit(1)
    }

    // Check if user already has admin role
    const existingAdminRole = user.roles.find((role) => role.role === 'ADMIN')
    if (existingAdminRole) {
      console.log(`✅ User "${email}" already has ADMIN role!`)
      process.exit(0)
    }

    // Create admin role
    await prisma.userRole.create({
      data: {
        userId: user.id,
        role: 'ADMIN',
        isActive: true,
      },
    })

    console.log(`✅ Admin role created successfully for "${email}"!`)
    console.log(`\n🔗 You can now access the admin dashboard at: http://localhost:3000/admin/dashboard`)
  } catch (error: any) {
    console.error('❌ Error creating admin:', error.message)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

// Get email from command line arguments
const email = process.argv[2]

if (!email) {
  console.log('Usage: npx tsx scripts/create-admin.ts <user-email>')
  console.log('\nExample:')
  console.log('  npx tsx scripts/create-admin.ts admin@example.com')
  process.exit(1)
}

createAdmin(email)
