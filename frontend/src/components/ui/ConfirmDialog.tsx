import { Modal, StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Text } from '@/components/ui/Text';
import { COLORS, SIZES } from '@/theme/assetTokens';

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
        <View style={styles.dialog} accessibilityRole="alert">
          <Text>{title}</Text>
          <Text>{message}</Text>

          <View style={styles.actions}>
            {onCancel ? <Button style={styles.half} title="취소" onPress={onCancel} /> : null}
            <Button variant="primary" style={styles.half} title={confirmLabel} onPress={onConfirm} />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  // 나란히 놓은 버튼이 폭을 반씩 나눈다
  half: {
    flex: 1,
  },
  backdrop: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  dialog: {
    gap: 12,
    padding: 24,
    borderWidth: SIZES.card.border,
    borderColor: COLORS.outline,
    borderRadius: SIZES.card.radius,
    backgroundColor: COLORS.card,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
});
