import { Image } from 'expo-image';
import { SymbolView } from 'expo-symbols';
import { Platform, Pressable, ScrollView, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ExternalLink } from '@/components/external-link';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Collapsible } from '@/components/ui/collapsible';
import { WebBadge } from '@/components/web-badge';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export default function TabTwoScreen() {
  const safeAreaInsets = useSafeAreaInsets();
  const insets = {
    ...safeAreaInsets,
    bottom: safeAreaInsets.bottom + BottomTabInset + Spacing.three,
  };
  const theme = useTheme();

  const contentPlatformStyle = Platform.select({
    android: {
      paddingTop: insets.top,
      paddingLeft: insets.left,
      paddingRight: insets.right,
      paddingBottom: insets.bottom,
    },
    web: {
      paddingTop: Spacing.six,
      paddingBottom: Spacing.four,
    },
  });

  return (
    <ScrollView
      style={[styles.scrollView, { backgroundColor: theme.background }]}
      contentInset={insets}
      contentContainerStyle={[styles.contentContainer, contentPlatformStyle]}>
      <ThemedView style={styles.container}>
        <ThemedView style={styles.titleContainer}>
          <ThemedText type="subtitle">Explorar</ThemedText>
          <ThemedText style={styles.centerText} themeColor="textSecondary">
            Recursos e exemplos técnicos do aplicativo.
          </ThemedText>

          <ExternalLink href="https://docs.expo.dev" asChild>
            <Pressable style={({ pressed }) => pressed && styles.pressed}>
              <ThemedView type="backgroundElement" style={styles.linkButton}>
                <ThemedText type="link">Documentação do Expo</ThemedText>
                <SymbolView
                  tintColor={theme.text}
                  name={{ ios: 'arrow.up.right.square', android: 'link', web: 'link' }}
                  size={12}
                />
              </ThemedView>
            </Pressable>
          </ExternalLink>
        </ThemedView>

        <ThemedView style={styles.sectionsWrapper}>
          <Collapsible title="Rotas por arquivos">
            <ThemedText type="small">
              Entre as rotas deste projeto estão <ThemedText type="code">src/app/index.tsx</ThemedText> e{' '}
              <ThemedText type="code">src/app/explore.tsx</ThemedText>
            </ThemedText>
            <ThemedText type="small">
              O arquivo <ThemedText type="code">src/app/_layout.tsx</ThemedText> configura a navegação.
            </ThemedText>
            <ExternalLink href="https://docs.expo.dev/router/introduction">
              <ThemedText type="linkPrimary">Saiba mais</ThemedText>
            </ExternalLink>
          </Collapsible>

          <Collapsible title="Suporte a Android, iOS e navegador">
            <ThemedView type="backgroundElement" style={styles.collapsibleContent}>
              <ThemedText type="small">
                Para abrir a versão web, pressione <ThemedText type="smallBold">w</ThemedText> no terminal que executa o projeto.
              </ThemedText>
              <Image
                source={require('@/assets/images/tutorial-web.png')}
                style={styles.imageTutorial}
              />
            </ThemedView>
          </Collapsible>

          <Collapsible title="Imagens">
            <ThemedText type="small">
              Para imagens estáticas, use os sufixos <ThemedText type="code">@2x</ThemedText> e{' '}
              <ThemedText type="code">@3x</ThemedText> para fornecer arquivos para diferentes densidades de tela.
            </ThemedText>
            <Image source={require('@/assets/images/react-logo.png')} style={styles.imageReact} />
            <ExternalLink href="https://reactnative.dev/docs/images">
              <ThemedText type="linkPrimary">Saiba mais</ThemedText>
            </ExternalLink>
          </Collapsible>

          <Collapsible title="Temas claro e escuro">
            <ThemedText type="small">
              Este aplicativo oferece temas claro e escuro.{' '}
              <ThemedText type="code">useColorScheme()</ThemedText> permite consultar o tema atual do dispositivo.
            </ThemedText>
            <ExternalLink href="https://docs.expo.dev/develop/user-interface/color-themes/">
              <ThemedText type="linkPrimary">Saiba mais</ThemedText>
            </ExternalLink>
          </Collapsible>

          <Collapsible title="Animações">
            <ThemedText type="small">
              O componente de exemplo{' '}
              <ThemedText type="code">src/components/ui/collapsible.tsx</ThemedText> usa <ThemedText type="code">react-native-reanimated</ThemedText> para animar a abertura das seções.
            </ThemedText>
          </Collapsible>
        </ThemedView>
        {Platform.OS === 'web' && <WebBadge />}
      </ThemedView>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  container: {
    maxWidth: MaxContentWidth,
    flexGrow: 1,
  },
  titleContainer: {
    gap: Spacing.three,
    alignItems: 'center',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.six,
  },
  centerText: {
    textAlign: 'center',
  },
  pressed: {
    opacity: 0.7,
  },
  linkButton: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.five,
    justifyContent: 'center',
    gap: Spacing.one,
    alignItems: 'center',
  },
  sectionsWrapper: {
    gap: Spacing.five,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
  },
  collapsibleContent: {
    alignItems: 'center',
  },
  imageTutorial: {
    width: '100%',
    aspectRatio: 296 / 171,
    borderRadius: Spacing.three,
    marginTop: Spacing.two,
  },
  imageReact: {
    width: 100,
    height: 100,
    alignSelf: 'center',
  },
});
