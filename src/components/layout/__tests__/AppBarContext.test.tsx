import { renderHook, act } from '@testing-library/react';
import { AppBarProvider, useAppBar } from '../AppBarContext';

describe('AppBarContext', () => {
  it('should provide setAppBarContent function', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <AppBarProvider>{children}</AppBarProvider>
    );

    const { result } = renderHook(() => useAppBar(), { wrapper });

    expect(result.current.setAppBarContent).toBeDefined();
    expect(typeof result.current.setAppBarContent).toBe('function');
  });

  it('should throw error when used outside provider', () => {
    expect(() => {
      renderHook(() => useAppBar());
    }).toThrow('useAppBar must be used within AppBarProvider');
  });

  it('should update content when setAppBarContent is called', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <AppBarProvider>{children}</AppBarProvider>
    );

    const { result } = renderHook(() => useAppBar(), { wrapper });

    act(() => {
      result.current.setAppBarContent(<div>Test Content</div>);
    });

    expect(result.current.content).not.toBeNull();
  });
});
