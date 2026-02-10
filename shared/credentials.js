from integrations.reddit import RedditAgent

def act_post_to_reddit(subreddit, title, body):
    reddit = RedditAgent(get_creds())
    post_id = reddit.post(subreddit, title, body)
    return post_id