-- Community Module Tables
-- Adds support for ADHD community wall with posts, comments, likes and helper scores

-- 🔹 Posts table
CREATE TABLE IF NOT EXISTS posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  author_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  is_anonymous BOOLEAN DEFAULT TRUE,
  content TEXT NOT NULL,
  tags TEXT[] DEFAULT '{}',
  like_count INTEGER DEFAULT 0,
  comment_count INTEGER DEFAULT 0,
  status TEXT CHECK (status IN ('active', 'hidden', 'reported')) DEFAULT 'active'
);

-- 🔹 Comments table
CREATE TABLE IF NOT EXISTS comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  author_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  is_anonymous BOOLEAN DEFAULT TRUE,
  content TEXT NOT NULL,
  like_count INTEGER DEFAULT 0,
  status TEXT CHECK (status IN ('active', 'hidden', 'reported')) DEFAULT 'active'
);

-- 🔹 Likes table
CREATE TABLE IF NOT EXISTS likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  target_type TEXT CHECK (target_type IN ('post', 'comment')) NOT NULL,
  target_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (user_id, target_type, target_id)
);

-- 🔹 Helper scores table
CREATE TABLE IF NOT EXISTS helper_scores (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  score INTEGER DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_status ON posts(status);
CREATE INDEX IF NOT EXISTS idx_posts_tags ON posts USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_comments_post_id ON comments(post_id);
CREATE INDEX IF NOT EXISTS idx_comments_created_at ON comments(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_likes_user_id ON likes(user_id);
CREATE INDEX IF NOT EXISTS idx_likes_target ON likes(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_helper_scores_score ON helper_scores(score DESC);

-- 🔒 RLS Policies

-- Enable RLS on all tables
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE helper_scores ENABLE ROW LEVEL SECURITY;

-- Posts: Anyone authenticated can read active posts
CREATE POLICY "Anyone can read active posts"
  ON posts FOR SELECT
  USING (auth.uid() IS NOT NULL AND status = 'active');

-- Posts: Authenticated users can create posts
CREATE POLICY "Authenticated users can create posts"
  ON posts FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = author_id);

-- Posts: Users can update their own posts (for moderation)
CREATE POLICY "Users can update own posts"
  ON posts FOR UPDATE
  USING (auth.uid() = author_id);

-- Comments: Anyone authenticated can read active comments
CREATE POLICY "Anyone can read active comments"
  ON comments FOR SELECT
  USING (auth.uid() IS NOT NULL AND status = 'active');

-- Comments: Authenticated users can create comments
CREATE POLICY "Authenticated users can create comments"
  ON comments FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = author_id);

-- Comments: Users can update their own comments
CREATE POLICY "Users can update own comments"
  ON comments FOR UPDATE
  USING (auth.uid() = author_id);

-- Likes: Users can read all likes
CREATE POLICY "Authenticated users can read likes"
  ON likes FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Likes: Users can create their own likes
CREATE POLICY "Users can create own likes"
  ON likes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Likes: Users can delete their own likes
CREATE POLICY "Users can delete own likes"
  ON likes FOR DELETE
  USING (auth.uid() = user_id);

-- Helper scores: Anyone can read helper scores
CREATE POLICY "Anyone can read helper scores"
  ON helper_scores FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Helper scores: System can update (via triggers or functions)
CREATE POLICY "System can update helper scores"
  ON helper_scores FOR ALL
  USING (true);

-- 🔧 Functions and Triggers

-- Function to update post comment count
CREATE OR REPLACE FUNCTION update_post_comment_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE posts SET comment_count = comment_count + 1 WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE posts SET comment_count = GREATEST(comment_count - 1, 0) WHERE id = OLD.post_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger for comment count
CREATE TRIGGER trigger_update_post_comment_count
AFTER INSERT OR DELETE ON comments
FOR EACH ROW EXECUTE FUNCTION update_post_comment_count();

-- Function to update like counts and helper scores
CREATE OR REPLACE FUNCTION update_like_counts_and_scores()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Update like count on target
    IF NEW.target_type = 'post' THEN
      UPDATE posts SET like_count = like_count + 1 WHERE id = NEW.target_id;
    ELSIF NEW.target_type = 'comment' THEN
      UPDATE comments SET like_count = like_count + 1 WHERE id = NEW.target_id;
      
      -- Increment helper score for comment author
      INSERT INTO helper_scores (user_id, score, updated_at)
      SELECT author_id, 1, NOW()
      FROM comments
      WHERE id = NEW.target_id AND author_id IS NOT NULL
      ON CONFLICT (user_id)
      DO UPDATE SET score = helper_scores.score + 1, updated_at = NOW();
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    -- Decrease like count on target
    IF OLD.target_type = 'post' THEN
      UPDATE posts SET like_count = GREATEST(like_count - 1, 0) WHERE id = OLD.target_id;
    ELSIF OLD.target_type = 'comment' THEN
      UPDATE comments SET like_count = GREATEST(like_count - 1, 0) WHERE id = OLD.target_id;
      
      -- Decrement helper score for comment author
      UPDATE helper_scores
      SET score = GREATEST(score - 1, 0), updated_at = NOW()
      WHERE user_id = (SELECT author_id FROM comments WHERE id = OLD.target_id AND author_id IS NOT NULL);
    END IF;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger for like counts and helper scores
CREATE TRIGGER trigger_update_like_counts_and_scores
AFTER INSERT OR DELETE ON likes
FOR EACH ROW EXECUTE FUNCTION update_like_counts_and_scores();
