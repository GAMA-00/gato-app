import React from 'react';
import EnhancedAvatar from '@/components/ui/enhanced-avatar';

const AvatarTest = () => {
  const testAvatars = [
    {
      name: 'Vicente Garófalo',
      avatar_url: 'https://jckynopecuexfamepmoh.supabase.co/storage/v1/object/public/avatars/6c2649d4-69de-4c8e-80f4-00cbd9b8e3d1/avatar.jpg'
    },
    {
      name: 'Vicente',
      avatar_url: 'https://jckynopecuexfamepmoh.supabase.co/storage/v1/object/public/avatars/332c3542-b873-43e2-b1b3-b306deef27a5/avatar.jpg'
    },
    {
      name: 'Juan',
      avatar_url: ''
    },
    {
      name: 'Alejandro Vega Varela',
      avatar_url: ''
    }
  ];

  return (
    <div className="p-6 space-y-4">
      <h2 className="text-xl font-bold mb-4">Avatar Test</h2>
      {testAvatars.map((user, index) => (
        <div key={index} className="flex items-center space-x-4 p-4 border rounded">
          <EnhancedAvatar
            src={user.avatar_url || null}
            alt={user.name}
            className="w-16 h-16"
          />
          <div>
            <p className="font-medium">{user.name}</p>
            <p className="text-sm text-muted-foreground">
              Avatar URL: {user.avatar_url || 'No avatar'}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
};

export default AvatarTest;