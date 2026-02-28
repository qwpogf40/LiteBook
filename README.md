# Litebook - Privacy-First Social Network

Litebook is a social network built with a focus on user privacy and security. It's designed to be a lightweight, secure alternative to traditional social media platforms.

## Features

- **Privacy-First**: No ad tracking, minimal data collection.
- **Secure Authentication**: JWT-based authentication with secure, httpOnly cookies.
- **End-to-End Encryption (Transit)**: All data is transmitted over HTTPS.
- **User Profiles**: Customizable profiles with gender, date of birth, and avatar support.
- **Friends System**: Secure friend requests and management.
- **Private Messaging**: Secure, private messaging between friends.
- **Posts**: Create and share posts with the community.
- **Privacy Center**: Export your data or delete your account at any time.
- **Security Checkup**: Monitor login history and change passwords securely.
- **Internationalization**: Support for English and Russian.

## Tech Stack

- **Frontend**: React 19, TypeScript, Tailwind CSS, Framer Motion, Lucide Icons.
- **Backend**: Node.js, Express.js.
- **Database**: SQLite (via `better-sqlite3`).
- **Security**: Helmet (CSP, etc.), JWT, bcryptjs.

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn

## Security

If you find any security vulnerabilities, please report them by opening an issue or contacting the maintainers directly.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
