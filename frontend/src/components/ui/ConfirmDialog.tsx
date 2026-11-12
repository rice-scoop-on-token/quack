import { Modal, StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Text } from '@/components/ui/Text';
import { FONT } from '@/theme/assetTokens';

type Props = {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  onConfirm: () => void;
  // 없으면 취소 버튼 없이 확인만 보여 준다
  onCancel?: () => void;
};

// 확인 창. RN의 Alert는 웹에서 동작하지 않아서 Modal로 만든다.
export function ConfirmDialog({ visible, title, message, confirmLabel, onConfirm, onCancel }: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel ?? onConfirm}>
      <View style={styles.backdrop}>
        <Card style={styles.dialog} accessibilityRole="alert">
          <Text style={styles.title}>{title}</Text>
          <Text>{message}</Text>

          <View style={styles.actions}>
            {onCancel ? <Button style={styles.half} title="취소" onPress={onCancel} /> : null}
            <Button variant="primary" style={styles.half} title={confirmLabel} onPress={onConfirm} />
          </View>
        </Card>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  // 나란히 놓은 버튼이 폭을 반씩 나눈다
  half: {
    flex: 1,
  },
  // 뒤 화면이 비쳐 글자가 겹쳐 보이지 않게 어둡게 덮는다(갈색 글자색 #3B2A1A에 투명도)
  backdrop: {
    flex: 1,
    justifyContent: 'center',
    padding: 16,
    backgroundColor: 'rgba(59, 42, 26, 0.55)',
  },
  dialog: {
    gap: 12,
    padding: 20,
  },
  title: {
    ...FONT.heading,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
});
