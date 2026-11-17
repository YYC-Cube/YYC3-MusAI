// jest-dom matchers 全局注册（迁移改造：源项目缺失 setupTests，显式引入以修复 toBeInTheDocument 未注册）
import '@testing-library/jest-dom';
