import { Button, Modal, StyleSheet, Text, View } from 'react-native';

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
            {onCancel ? <Button title="취소" onPress={onCancel} /> : null}
            <Button title={confirmLabel} onPress={onConfirm} />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  // 창 위치가 보이도록 테두리만 둔다. 배경이 비치지 않게 흰 배경을 임시로 둔다.
  dialog: {
    gap: 12,
    padding: 24,
    borderWidth: 1,
    backgroundColor: '#fff',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
});
