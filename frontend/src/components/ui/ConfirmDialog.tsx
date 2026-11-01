import { Button, Modal, StyleSheet, Text, View } from 'react-native';

type Props = {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
};

// 확인 창. RN의 Alert는 웹에서 동작하지 않아서 Modal로 만든다.
export function ConfirmDialog({ visible, title, message, confirmLabel, onConfirm, onCancel }: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      {/* 확인 창 배경 */}
      <View style={styles.backdrop}>
        {/* 확인 창 상자 */}
        <View style={styles.dialog} accessibilityRole="alert">
          {/* 확인 창 제목과 내용 */}
          <Text>{title}</Text>
          <Text>{message}</Text>

          {/* 확인 창 버튼 */}
          <View style={styles.actions}>
            {/* 취소 버튼 */}
            <Button title="취소" onPress={onCancel} />
            {/* 확인 버튼 */}
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
