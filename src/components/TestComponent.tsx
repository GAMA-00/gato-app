
import React from 'react';

const TestComponent: React.FC = () => {
  console.log("TestComponent - Rendering");
  
  return (
    <div className="p-4 bg-green-100 border border-green-300 rounded">
      <h2 className="text-green-800 font-bold">Componente de prueba</h2>
      <p className="text-green-700">Si ves esto, React está funcionando correctamente.</p>
    </div>
  );
};

export default TestComponent;
