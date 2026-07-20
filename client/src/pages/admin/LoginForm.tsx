import { useState } from 'react';
import { SafetyCertificateOutlined, UserOutlined, LockOutlined } from '@ant-design/icons';
import { Alert, Button, Card, Form, Input, Layout, Space, Typography } from 'antd';
import { adminFetch } from './utils';

export default function LoginForm({ onLoggedIn }: { onLoggedIn: () => void }) {
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (values: { username: string; password: string }) => {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      await adminFetch('/api/admin/login', {
        method: 'POST',
        body: JSON.stringify({ username: values.username.trim(), password: values.password }),
      });
      onLoggedIn();
    } catch (err) {
      setError(err instanceof Error ? err.message : '登录失败');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Layout style={{ minHeight: '100vh', background: '#f5f7fa' }}>
      <Layout.Content
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 24,
        }}
      >
        <Card style={{ width: '100%', maxWidth: 400 }} bordered={false}>
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <Space>
              <SafetyCertificateOutlined style={{ fontSize: 22, color: '#1677ff' }} />
              <Typography.Title level={4} style={{ margin: 0 }}>
                站点管理后台
              </Typography.Title>
            </Space>
            <Typography.Text type="secondary">输入管理员账号密码登录</Typography.Text>
            {error && <Alert type="error" message={error} showIcon />}
            <Form layout="vertical" onFinish={submit} requiredMark={false}>
              <Form.Item
                name="username"
                rules={[{ required: true, message: '请输入管理员账号' }]}
              >
                <Input
                  prefix={<UserOutlined />}
                  placeholder="管理员账号"
                  autoFocus
                  autoComplete="username"
                  spellCheck={false}
                />
              </Form.Item>
              <Form.Item
                name="password"
                rules={[{ required: true, message: '请输入密码' }]}
              >
                <Input.Password
                  prefix={<LockOutlined />}
                  placeholder="密码"
                  autoComplete="current-password"
                />
              </Form.Item>
              <Form.Item style={{ marginBottom: 0 }}>
                <Button type="primary" htmlType="submit" block loading={busy}>
                  登录
                </Button>
              </Form.Item>
            </Form>
          </Space>
        </Card>
      </Layout.Content>
    </Layout>
  );
}
