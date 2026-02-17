import { render, screen } from '@testing-library/react';
import { useEffect } from 'react';
import { AppBarProvider, useAppBar } from '../AppBarContext';
import UnifiedAppBar from '../UnifiedAppBar';
import { AuthUser } from '@/types/todo';

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(() => null),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
  length: 0,
  key: vi.fn(() => null),
};
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// Mock dependencies
vi.mock('@/lib/supabaseClient', () => ({
  supabase: {
    from: () => ({
      select: () => ({
        gt: () => ({
          neq: () => Promise.resolve({ count: 0, error: null }),
        }),
      }),
    }),
    channel: () => ({
      on: () => ({ subscribe: () => ({}) }),
    }),
    removeChannel: vi.fn(),
  },
}));

vi.mock('@/store/todoStore', () => ({
  useTodoStore: (selector: (state: Record<string, unknown>) => unknown) =>
    selector({ ui: { focusMode: false } }),
}));

vi.mock('../AppShell', () => ({
  useAppShell: () => ({
    triggerNewTask: vi.fn(),
    setActiveView: vi.fn(),
  }),
}));

vi.mock('@/components/UserMenu', () => ({
  UserMenu: ({ currentUser }: { currentUser: AuthUser }) => (
    <div data-testid="user-menu">{currentUser.name}</div>
  ),
}));

vi.mock('@/components/NotificationModal', () => ({
  default: () => <div data-testid="notification-modal" />,
}));

const mockUser: AuthUser = {
  id: '1',
  name: 'Test User',
  email: 'test@example.com',
};

describe('UnifiedAppBar', () => {
  it('should render New Task button', () => {
    render(
      <AppBarProvider>
        <UnifiedAppBar currentUser={mockUser} onUserChange={() => {}} />
      </AppBarProvider>
    );

    expect(screen.getByLabelText(/create new task/i)).toBeInTheDocument();
  });

  it('should render notifications bell', () => {
    render(
      <AppBarProvider>
        <UnifiedAppBar currentUser={mockUser} onUserChange={() => {}} />
      </AppBarProvider>
    );

    expect(screen.getByLabelText(/notifications/i)).toBeInTheDocument();
  });

  it('should render user menu', () => {
    render(
      <AppBarProvider>
        <UnifiedAppBar currentUser={mockUser} onUserChange={() => {}} />
      </AppBarProvider>
    );

    expect(screen.getByText(mockUser.name)).toBeInTheDocument();
  });

  it('should render dynamic content from context', () => {
    const TestComponent = () => {
      const { setAppBarContent } = useAppBar();

      useEffect(() => {
        setAppBarContent(<div>Custom Content</div>);
      }, [setAppBarContent]);

      return null;
    };

    render(
      <AppBarProvider>
        <UnifiedAppBar currentUser={mockUser} onUserChange={() => {}} />
        <TestComponent />
      </AppBarProvider>
    );

    expect(screen.getByText('Custom Content')).toBeInTheDocument();
  });
});
