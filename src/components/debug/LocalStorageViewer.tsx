
import React, { useState, useEffect } from 'react';

const LocalStorageViewer: React.FC = () => {
  const [storageItems, setStorageItems] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    const items: { [key: string]: string } = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        items[key] = localStorage.getItem(key) || '';
      }
    }
    setStorageItems(items);
  }, []);

  return (
    <div className="p-4 bg-gray-100 rounded-lg">
      <h2 className="text-lg font-bold mb-4">Local Storage Contents</h2>
      {Object.entries(storageItems).map(([key, value]) => (
        <div key={key} className="mb-2">
          <strong>{key}:</strong> {value}
        </div>
      ))}
    </div>
  );
};

export default LocalStorageViewer;
