import { Box, Typography, Paper, Grid, Button, Card, CardContent } from '@mui/material';

const HomePage = () => {
  return (
    <Box>
      <Paper elevation={2} sx={{ p: 4, mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Welcome to Brand is Code
        </Typography>
        <Typography variant="body1" paragraph>
          Transform your brand building from art to science with our data-driven, systematic approach.
          No more guesswork or "spaghetti throwing" - build your brand the same way developers write code:
          systematic, testable, and iterative.
        </Typography>
        <Button variant="contained" color="primary" size="large" href="/brand-builder">
          Start Building Your Brand
        </Button>
      </Paper>

      <Typography variant="h5" component="h2" gutterBottom sx={{ mt: 4 }}>
        Why Brand is Code?
      </Typography>

      <Grid container spacing={3}>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" component="h3" gutterBottom>
                Data-Driven Decisions
              </Typography>
              <Typography variant="body2">
                Replace guesswork with data-informed brand building. Every step in the process is supported by
                market research, analytics, and proven methodologies.
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" component="h3" gutterBottom>
                Systematic & Repeatable
              </Typography>
              <Typography variant="body2">
                Break down brand building into discrete, interconnected steps with clear inputs and outputs,
                making the process systematic and repeatable.
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" component="h3" gutterBottom>
                Measurable Outcomes
              </Typography>
              <Typography variant="body2">
                Track progress and effectiveness with metrics and analytics at each stage of the brand development
                process, ensuring measurable and optimizable outcomes.
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default HomePage;
