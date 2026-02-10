import praw

class RedditAgent:
    def __init__(self, client_id, client_secret, username, password, user_agent):
        self.reddit = praw.Reddit(
            client_id=client_id,
            client_secret=client_secret,
            username=username,
            password=password,
            user_agent=user_agent
        )
    
    def create_account(self, email, username, password):
        # Reddit limits direct API account creation; workaround via Selenium or REST if needed.
        pass

    def post(self, subreddit, title, body):
        submission = self.reddit.subreddit(subreddit).submit(title, selftext=body)
        return submission.id

# Credentials fetched/stored securely in shared/credentials.json