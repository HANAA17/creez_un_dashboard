import React from 'react';
import { View } from 'react-native';
import { Button, Txt } from './components';
import { monthLabel, shiftMonth } from './format';

export function MonthNav({ month, onChange }: { month: string; onChange: (m: string) => void }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
      <Button title="‹" variant="ghost" onPress={() => onChange(shiftMonth(month, -1))} />
      <Txt bold size={17}>{monthLabel(month)}</Txt>
      <Button title="›" variant="ghost" onPress={() => onChange(shiftMonth(month, 1))} />
    </View>
  );
}
