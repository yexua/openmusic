import { useEffect, useRef, useState } from 'react';
import { KeyOutlined } from '@ant-design/icons';
import { App, Button, Card, Col, Input, Row, Space, Tag, Typography } from 'antd';
import { adminFetch } from './utils';

export default function CredentialsPanel({
  adminUsername,
  persisted,
  forced,
  bare,
  onError,
  onSaved,
}: {
  adminUsername: string;
  persisted: boolean;
  forced?: boolean;
  bare?: boolean;
  onError: (message: string) => void;
  onSaved: () => void;
}) {
  const { message } = App.useApp();
  const [username, setUsername] = useState(adminUsername);
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const touchedRef = useRef(false);

  useEffect(() => {
    if (!touchedRef.current) setUsername(adminUsername);
  }, [adminUsername]);

  const save = async () => {
    if (saving) return;
    if (password !== passwordConfirm) {
      onError('两次输入的新密码不一致');
      return;
    }
    if (password === '123456') {
      onError('不能继续使用默认密码');
      return;
    }
    setSaving(true);
    try {
      const res = await adminFetch<{ username: string; persisted: boolean }>('/api/admin/credentials', {
        method: 'PUT',
        body: JSON.stringify({ username: username.trim(), password, currentPassword }),
      });
      touchedRef.current = false;
      setPassword('');
      setPasswordConfirm('');
      setCurrentPassword('');
      message.success(`已保存到 Redis（${res.username}），其它已登录会话已失效`);
      onSaved();
    } catch (err) {
      onError(err instanceof Error ? err.message : '修改账号密码失败');
    } finally {
      setSaving(false);
    }
  };

  const body = (
    <Space direction="vertical" size="middle" style={{ width: '100%' }}>
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12}>
          <Typography.Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>
            账号（2–32 位字母数字或 _ . @ -）
          </Typography.Text>
          <Input
            value={username}
            onChange={(e) => {
              touchedRef.current = true;
              setUsername(e.target.value);
            }}
            autoComplete="username"
            spellCheck={false}
          />
        </Col>
        <Col xs={24} sm={12}>
          <Typography.Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>
            当前密码
          </Typography.Text>
          <Input.Password
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            autoComplete="current-password"
          />
        </Col>
        <Col xs={24} sm={12}>
          <Typography.Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>
            新密码（8–64 位）
          </Typography.Text>
          <Input.Password
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
          />
        </Col>
        <Col xs={24} sm={12}>
          <Typography.Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>
            确认新密码
          </Typography.Text>
          <Input.Password
            value={passwordConfirm}
            onChange={(e) => setPasswordConfirm(e.target.value)}
            autoComplete="new-password"
          />
        </Col>
      </Row>
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <Button
          type="primary"
          onClick={() => void save()}
          loading={saving}
          disabled={!username.trim() || password.length < 8 || !currentPassword}
        >
          保存账号密码
        </Button>
      </div>
    </Space>
  );

  if (bare) return body;

  return (
    <Card
      title={(
        <Space>
          <KeyOutlined />
          <span>管理员账号</span>
          {forced && <Tag color="warning">必须修改</Tag>}
          <Tag color={persisted ? 'success' : 'error'} style={{ marginLeft: 'auto' }}>
            {persisted ? 'Redis 持久化' : 'Redis 未就绪'}
          </Tag>
        </Space>
      )}
    >
      <Typography.Paragraph type="secondary" style={{ fontSize: 12 }}>
        密码以 scrypt 哈希存 Redis（不落盘）；新密码至少 8 位且不能是默认密码；修改后其它会话立即失效
      </Typography.Paragraph>
      {body}
    </Card>
  );
}
