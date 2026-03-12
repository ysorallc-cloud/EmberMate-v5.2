import * as fs from 'fs';
import * as path from 'path';

describe('Coffee Moment articles', () => {
  const filePath = path.resolve(__dirname, '..', 'components', 'CoffeeMomentMinimal.tsx');
  const content = fs.readFileSync(filePath, 'utf-8');

  it('should have a CAREGIVER_ARTICLES array with at least 4 items', () => {
    expect(content).toContain('CAREGIVER_ARTICLES');
    const articleMatches = content.match(/emoji:\s*'/g);
    expect(articleMatches).not.toBeNull();
    expect(articleMatches!.length).toBeGreaterThanOrEqual(4);
  });

  it('should contain article section text in the component', () => {
    const hasArticleSection =
      content.includes('Something for you') || content.includes("While you're here");
    expect(hasArticleSection).toBe(true);
  });
});
