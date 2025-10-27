# Debug: ConversationId bị NULL từ message thứ 2 trở đi

## 🔍 Vấn đề hiện tại

- Message 1: conversationId = OK ✓
- Message 2+: conversationId = null ✗

## ✅ Đã Fix Code

### 1. Tạo `verifyConversation` method (không load relations)
```typescript
// KHÔNG dùng getConversation (có relations) trong sendMessage
// Dùng verifyConversation (không relations)
private async verifyConversation(id: string, user: User): Promise<Conversation> {
  const conversation = await this.conversationRepository.findOne({
    where: { id, user: { id: user.id } },
    // KHÔNG có relations: ['messages', 'user']
  });
  // ...
}
```

### 2. Chỉ set foreign keys khi tạo message
```typescript
const userMessage = this.messageRepository.create({
  content: sendMessageDto.content,
  type: MessageType.USER,
  status: MessageStatus.SENT,
  metadata: sendMessageDto.metadata,
  conversationId: conversation.id,  // QUAN TRỌNG: Chỉ ID
  userId: user.id,                  // QUAN TRỌNG: Chỉ ID
});
// KHÔNG set conversation object, KHÔNG set user object
```

---

## 🔧 Cần làm NGAY

### Bước 1: RESTART API Server
```bash
# Dừng server (Ctrl+C trong terminal api:dev)
# Hoặc kill process
taskkill /F /IM node.exe

# Xóa build cache
cd apps/api
rm -rf dist
# Hoặc trên Windows
rmdir /s /q dist

# Start lại
npm run dev
```

### Bước 2: Test với conversation MỚI
```
1. Click "New Conversation" trong sidebar
2. Gửi message 1: "test 1"
3. Gửi message 2: "test 2"  
4. Gửi message 3: "test 3"
```

### Bước 3: Kiểm tra trong Database
```sql
-- Lấy conversation mới nhất
SELECT id, title, "messageCount", "createdAt" 
FROM conversations 
ORDER BY "createdAt" DESC 
LIMIT 1;

-- Kiểm tra messages của conversation đó (thay YOUR_CONVERSATION_ID)
SELECT 
  id, 
  content, 
  "conversationId",
  "createdAt"
FROM messages 
WHERE "userId" = (
  SELECT "userId" FROM conversations 
  WHERE id = 'YOUR_CONVERSATION_ID'
)
AND "createdAt" >= (
  SELECT "createdAt" FROM conversations 
  WHERE id = 'YOUR_CONVERSATION_ID'
)
ORDER BY "createdAt";
```

**Kết quả mong đợi**: TẤT CẢ messages đều có cùng conversationId ✅

---

## 🐛 Nếu vẫn bị lỗi

### Debug 1: Check xem code mới đã được load chưa

Thêm log tạm thời trong `chat.service.ts` line 95:
```typescript
conversation = await this.verifyConversation(
  sendMessageDto.conversationId,
  user,
);
console.log('DEBUG: conversation object:', JSON.stringify({
  id: conversation.id,
  userId: conversation.userId,
  hasMessages: !!conversation.messages,  // Phải là false (undefined)
  hasUser: !!conversation.user,          // Phải là false (undefined)
}));
```

**Nếu hasMessages = true hoặc hasUser = true** → Code cũ vẫn đang chạy!

### Debug 2: Check message object trước khi save

Thêm log sau line 118:
```typescript
const userMessage = this.messageRepository.create({
  content: sendMessageDto.content,
  type: MessageType.USER,
  status: MessageStatus.SENT,
  metadata: sendMessageDto.metadata,
  conversationId: conversation.id,
  userId: user.id,
});

console.log('DEBUG: userMessage before save:', JSON.stringify({
  conversationId: userMessage.conversationId,
  userId: userMessage.userId,
  hasConversationObject: !!userMessage.conversation,  // Phải là false
  hasUserObject: !!userMessage.user,                  // Phải là false
}));
```

**Nếu hasConversationObject = true** → Vẫn đang set conversation object ở đâu đó!

### Debug 3: Check sau khi save

Thêm log sau line 125:
```typescript
const savedUserMessage = await this.messageRepository.save(userMessage);

console.log('DEBUG: savedUserMessage after save:', JSON.stringify({
  id: savedUserMessage.id,
  conversationId: savedUserMessage.conversationId,  // PHẢI CÓ GIÁ TRỊ
  userId: savedUserMessage.userId,                  // PHẢI CÓ GIÁ TRỊ
}));
```

**Nếu conversationId = null** → Vấn đề khi save vào DB!

---

## 🔍 Khả năng gốc rễ vấn đề

### 1. Code cũ vẫn đang chạy (90% khả năng)
- **Nguyên nhân**: TypeScript transpile cache
- **Fix**: Xóa `dist/` folder và rebuild

### 2. TypeORM cascade save (5% khả năng)
- **Nguyên nhân**: Conversation entity có `cascade: true` trong relation
- **Fix**: Kiểm tra conversation.entity.ts line 50-52

### 3. Database constraint issue (3% khả năng)
- **Nguyên nhân**: Foreign key constraint có vấn đề
- **Fix**: 
  ```sql
  -- Check constraint
  SELECT 
    conname AS constraint_name,
    contype AS constraint_type,
    pg_get_constraintdef(oid) AS definition
  FROM pg_constraint
  WHERE conrelid = 'messages'::regclass
    AND conname LIKE '%conversation%';
  ```

### 4. Concurrent save issue (2% khả năng)
- **Nguyên nhân**: Race condition khi save message và conversation
- **Fix**: Wrap trong transaction

---

## 🎯 Giải pháp CUỐI CÙNG nếu tất cả đều thất bại

### Option A: Transaction wrapper
```typescript
async sendMessage(...) {
  return await this.conversationRepository.manager.transaction(
    async (transactionalEntityManager) => {
      // Tất cả operations dùng transactionalEntityManager
      const conversation = await transactionalEntityManager.findOne(
        Conversation,
        { where: { id: sendMessageDto.conversationId } }
      );
      
      const userMessage = transactionalEntityManager.create(Message, {
        conversationId: conversation.id,
        userId: user.id,
        // ...
      });
      
      const savedUserMessage = await transactionalEntityManager.save(userMessage);
      // ...
    }
  );
}
```

### Option B: Raw query (nuclear option)
```typescript
await this.messageRepository.query(`
  INSERT INTO messages (id, content, type, status, "conversationId", "userId", "createdAt", "updatedAt")
  VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
`, [
  uuid(),
  sendMessageDto.content,
  MessageType.USER,
  MessageStatus.SENT,
  conversation.id,
  user.id,
]);
```

---

## 📊 Checklist Hoàn Chỉnh

- [ ] Restart API server (kill process + restart)
- [ ] Xóa dist/ folder
- [ ] Rebuild code
- [ ] Test với conversation MỚI (không phải conversation cũ)
- [ ] Check logs có "DEBUG:" không
- [ ] Check DB: tất cả messages có conversationId chưa
- [ ] Nếu vẫn lỗi: Thêm debug logs ở 3 điểm trên
- [ ] Nếu vẫn lỗi: Dùng transaction wrapper
- [ ] Nếu vẫn lỗi: Dùng raw query

---

## 📝 Báo cáo lại cho tôi

Sau khi làm theo các bước trên, hãy gửi cho tôi:

1. **Logs từ terminal api:dev** (đặc biệt là dòng có "DEBUG:")
2. **Kết quả query SQL** kiểm tra conversationId
3. **Screenshot** nếu vẫn lỗi

Tôi sẽ debug tiếp dựa trên thông tin đó! 🚀
