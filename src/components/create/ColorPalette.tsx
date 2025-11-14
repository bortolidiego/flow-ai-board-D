import React, { useState } from 'react';
import { Toast } from 'sonner';

interface ColorPaletteState {
  color: string;
  isOpen: boolean;
}

const ColorPalette: React.FC = () => {
  const [color, setColor] = useState('white');
  const [isOpen, setIsOpen] = useState(false);

  const handleColorChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setColor(e.target.value.toLowerCase());
  };

  const openCloseDialog = async () => {
    try {
      // Simulate async operation
      // await fetch('https://your-api.com/endpoint');
      await Toast.show('Color updated!', 2000);
      setIsOpen(false);
    } catch (error) {
      await Toast.show('Error updating color', 3000);
    }
  };

  return (
    <div className="p-4">
      <div className="flex gap-3 items-center mb-4">
        <label htmlFor="color-picker">Select Color</label>
        <input
          type="color"
          id="color-picker"
          value={color}
          onChange={handleColorChange}
          className="border border-gray-300 p-2 rounded-md w-20 h-20"
        />
      </div>
      
      <AlertDialog 
        title="Color Update Required"
        onClose={() => setIsOpen(false)}
        actions={[
          {
            label: 'Close',
            onClick: () => setIsOpen(false)
          }
        ]}
      />
    </div>
  );
};

ColorPalette.defaultProps = {
  color: '#FFFFFF',
  isOpen: false
};

export default ColorPalette;