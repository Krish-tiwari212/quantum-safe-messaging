<p align="center">
  <h1 align="center">Quantum Safe Messaging</h1>
</p>

<p align="center">
  <a href="https://opensource.org/licenses/MIT" rel="nofollow"><img src="https://img.shields.io/github/license/Krish-tiwari212/quantum-safe-messaging" alt="License"></a>
</p>

## Introduction

Quantum Safe Messaging is a secure communication platform leveraging quantum-resistant cryptographic algorithms to ensure the safety of your messages in the post-quantum era. This application is designed to provide end-to-end encrypted communication, protecting user data from potential attacks by quantum computers.

### What's included

- **Quantum-safe encryption**: Built with quantum-resistant cryptographic algorithms to secure your messages.
- **User authentication**: Secure login and user management using [Supabase](https://supabase.com).
- **Real-time messaging**: Instant communication powered by modern backend technologies.
- **Scalable architecture**: Designed to handle growth and large user bases.
- **Responsive design**: Accessible and user-friendly interface for all devices.

## Getting started

### 1. Setup Supabase

1. Go to [supabase.com](https://supabase.com) and create a project.
2. Go to Project Settings → Database → Database password and reset the database password.
3. Save this password somewhere safe, as it won't be visible after closing the box.

### 2. Deploy

1. Clone this repository to your local machine.
2. Create a `.env.local` file and configure your environment variables (refer to the `.env.local.example` file).
3. Install dependencies by running:

   ```bash
   npm install
   ```

4. Deploy the application using your preferred hosting service (e.g., Vercel, AWS, etc.).

### 3. Run the application

1. Start the development server:

   ```bash
   npm run dev
   ```

2. Open the app in your browser at `http://localhost:3000`.

## Features

- **End-to-End Encryption**: All messages are securely encrypted and can only be accessed by the intended recipient.
- **Quantum-Resistant Algorithms**: Protects against future threats posed by quantum computing.
- **User Authentication**: Securely manage user accounts and sessions.
- **Real-time Communication**: Chat in real-time with low latency.

## File structure

The application follows a feature-based project structure:

- **Features**: All code related to specific features is colocated under the `src/features` directory.
- **UI Components**: Reusable UI components are organized under the `src/components` directory.
- **Libraries and Utilities**: Shared utilities are located in the `src/libs` directory.

## Future Improvements

- Add support for additional quantum-safe cryptographic algorithms.
- Expand authentication methods to support OAuth providers.
- Improve scalability for handling larger user bases.

## Support

If you need help with the setup or development, feel free to reach out by creating an issue in this repository.

## Contribute

Contributions are welcome! Submit your pull requests to help make this app even better.
