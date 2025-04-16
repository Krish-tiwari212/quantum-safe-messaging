import { getUser } from '@/features/account/controllers/get-user';
import { getUserConversations } from '@/features/messaging/controllers/conversation-controller';
import { MessageDashboard } from '@/features/messaging/components/message-dashboard';
import { Container } from '@/components/container';

export default async function MessagesPage() {
  const [user, conversations] = await Promise.all([
    getUser(),
    getUserConversations()
  ]);
  
  return (
    <Container>
      <div className="py-8">
        <h1 className="text-2xl font-bold mb-6">Quantum-Safe Messages</h1>
        <div className="bg-black rounded-lg p-1 h-[calc(80vh-10rem)]">
          <MessageDashboard 
            initialUser={user} 
            initialConversations={conversations}
          />
        </div>
      </div>
    </Container>
  );
}