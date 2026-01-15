import { RoleType } from '@prisma/client'
import 'next-auth'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      email: string
      name?: string | null
      image?: string | null
      roles: RoleType[]
      phoneNumber: string | null
      emailVerified: Date | null
    }
  }

  interface User {
    id: string
    roles?: RoleType[]
    phoneNumber?: string | null
    emailVerified?: Date | null
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string
    roles: RoleType[]
    phoneNumber: string | null
    emailVerified: Date | null
  }
}
